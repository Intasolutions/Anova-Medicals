from django.db import models
from rest_framework import serializers
from .models import Invoice, InvoiceItem, PaymentTransaction

class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = '__all__'
        read_only_fields = ['invoice']

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'
        read_only_fields = ['invoice']

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, required=False)
    payments = PaymentTransactionSerializer(many=True, read_only=True)
    amount_paid = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    
    patient_display = serializers.SerializerMethodField()
    patient_id = serializers.SerializerMethodField()
    registration_number = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'visit', 'patient', 'patient_name', 'total_amount', 'discount_amount', 'refund_amount', 'payment_status', 'payment_mode', 'remarks', 'items', 'payments', 'amount_paid', 'balance_due', 'patient_display', 'patient_id', 'registration_number', 'created_at']

    def validate_discount_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Discount cannot be negative.")
        return value

    @staticmethod
    def _check_discount_not_exceeding_total(invoice):
        discount = invoice.discount_amount or 0
        if discount > invoice.total_amount:
            raise serializers.ValidationError({
                "discount_amount": f"Discount (₹{discount}) cannot exceed the invoice total (₹{invoice.total_amount})."
            })

    def get_amount_paid(self, obj):
        return sum(p.amount for p in obj.payments.all())

    def get_balance_due(self, obj):
        paid = sum(p.amount for p in obj.payments.all())
        discount = obj.discount_amount or 0
        refund = obj.refund_amount or 0
        return max(0, obj.total_amount - discount - refund - paid)

    def get_patient_display(self, obj):
        if obj.visit and obj.visit.patient:
            return obj.visit.patient.full_name
        return obj.patient_name or "Walking Patient"

    def get_patient_id(self, obj):
        if obj.visit and obj.visit.patient:
            return obj.visit.patient.id
        return None

    def get_registration_number(self, obj):
        if obj.visit and obj.visit.patient:
            return obj.visit.patient.registration_number
        return "N/A"

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        visit = validated_data.get('visit')
        
        invoice = None
        if visit:
            invoice = Invoice.objects.filter(visit=visit).order_by('created_at').first()
            
        if invoice:

            # Append items to existing master invoice. Items are matched by
            # description only (medicine/service name) -- batch is a pharmacy
            # stock concern, not something the patient's bill should split on.
            # A repeat of the same medicine/service merges into the existing
            # line (qty and amount added together) instead of being dropped.
            for item_data in items_data:
                desc = item_data.get('description')

                existing_item = InvoiceItem.objects.filter(
                    invoice=invoice,
                    description=desc
                ).first()

                if existing_item:
                    new_qty = item_data.get('qty', 1) or 1
                    new_amount = item_data.get('amount', 0) or 0
                    existing_item.qty = (existing_item.qty or 0) + new_qty
                    existing_item.amount = (existing_item.amount or 0) + new_amount
                    if existing_item.qty:
                        existing_item.unit_price = existing_item.amount / existing_item.qty
                    existing_item.save()
                else:
                    InvoiceItem.objects.create(invoice=invoice, **item_data)

            # Recalculate total amount
            invoice.total_amount = sum(item.amount for item in invoice.items.all())
            self._check_discount_not_exceeding_total(invoice)

            # Adjust payment status based on new total
            paid_amount = sum(p.amount for p in invoice.payments.all())
            discount = invoice.discount_amount or 0
            
            if invoice.total_amount == 0:
                invoice.payment_status = 'PENDING'
            elif paid_amount + discount >= invoice.total_amount:
                invoice.payment_status = 'PAID'
            elif paid_amount > 0:
                invoice.payment_status = 'PARTIAL'
            else:
                invoice.payment_status = 'PENDING'
                
            invoice.save()
        else:
            # Create new invoice
            invoice = Invoice.objects.create(**validated_data)

            # Merge items by description (medicine/service name) -- batch is a
            # pharmacy stock concern, not something the patient's bill should
            # split on. A repeat of the same medicine/service merges into one
            # line (qty and amount added together) instead of being dropped.
            merged_items = {}
            item_order = []
            for item_data in items_data:
                desc = item_data.get('description')
                if desc in merged_items:
                    existing = merged_items[desc]
                    new_qty = item_data.get('qty', 1) or 1
                    new_amount = item_data.get('amount', 0) or 0
                    existing['qty'] = (existing.get('qty') or 0) + new_qty
                    existing['amount'] = (existing.get('amount') or 0) + new_amount
                    if existing['qty']:
                        existing['unit_price'] = existing['amount'] / existing['qty']
                else:
                    merged_items[desc] = dict(item_data)
                    item_order.append(desc)

            for desc in item_order:
                InvoiceItem.objects.create(invoice=invoice, **merged_items[desc])

            # Recalculate total amount to ensure accuracy after merging
            invoice.total_amount = sum(item.amount for item in invoice.items.all())
            self._check_discount_not_exceeding_total(invoice)
            invoice.save()
                
            if invoice.payment_status == 'PAID' and invoice.total_amount > 0:
                PaymentTransaction.objects.create(
                    invoice=invoice,
                    amount=invoice.total_amount,
                    mode=getattr(invoice, 'payment_mode', 'CASH') or 'CASH',
                    remarks='Auto-generated from direct paid invoice'
                )
        
        # Emit Socket Event
        try:
            from asgiref.sync import async_to_sync
            from revive_cms.sio import sio
            async_to_sync(sio.emit)('billing_update', {
                'invoice_id': str(invoice.id),
                'amount': float(invoice.total_amount),
                'status': invoice.payment_status
            })
        except Exception as e:
            print(f"Socket emit error: {e}")

        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        # total_amount must always equal the sum of the invoice's items -- never
        # trust a client-supplied value for it, whether or not items are being
        # touched in this particular update.
        validated_data.pop('total_amount', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            # Sync Items: Keep existing, create new, remove missing
            keep_ids = []
            for item_data in items_data:
                item_id = item_data.get('id')
                if item_id:
                    item_instance = InvoiceItem.objects.filter(id=item_id, invoice=instance).first()
                    if item_instance:
                        for attr, value in item_data.items():
                            setattr(item_instance, attr, value)
                        item_instance.save()
                        keep_ids.append(item_instance.id)
                    else:
                        # Fallback: create if ID not found but provided (unlikely)
                        new_item = InvoiceItem.objects.create(invoice=instance, **item_data)
                        keep_ids.append(new_item.id)
                else:
                    # New item
                    new_item = InvoiceItem.objects.create(invoice=instance, **item_data)
                    keep_ids.append(new_item.id)

            # Remove missing items
            instance.items.exclude(id__in=keep_ids).delete()

        # Always recompute from the actual line items -- this is the source of truth,
        # not whatever the client sent, and must reflect any items sync above.
        instance.total_amount = sum(item.amount for item in instance.items.all())
        self._check_discount_not_exceeding_total(instance)
        instance.save()

        # Emit Socket Event
        try:
            from asgiref.sync import async_to_sync
            from revive_cms.sio import sio
            async_to_sync(sio.emit)('billing_update', {
                'invoice_id': str(instance.id),
                'amount': float(instance.total_amount),
                'status': instance.payment_status
            })
        except Exception as e:
            print(f"Socket emit error: {e}")

        return instance
