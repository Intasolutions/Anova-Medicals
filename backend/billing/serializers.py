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

    def get_amount_paid(self, obj):
        return sum(p.amount for p in obj.payments.all())

    def get_balance_due(self, obj):
        paid = sum(p.amount for p in obj.payments.all())
        discount = obj.discount_amount or 0
        return max(0, obj.total_amount - discount - paid)

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

            # Append items to existing master invoice (Deduplicating to prevent double amounts)
            for item_data in items_data:
                desc = item_data.get('description')
                batch = item_data.get('batch', '')
                
                # Check if item already exists on this invoice
                exists = InvoiceItem.objects.filter(
                    invoice=invoice,
                    description=desc
                ).filter(
                    models.Q(batch=batch) | models.Q(batch__isnull=True)
                ).exists()
                
                if not exists:
                    InvoiceItem.objects.create(invoice=invoice, **item_data)
                
            # Recalculate total amount
            invoice.total_amount = sum(item.amount for item in invoice.items.all())
            
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
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=invoice, **item_data)
                
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
