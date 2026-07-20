from django.db import transaction
from rest_framework import serializers
from .models import (
    LabInventory, LabCharge, LabInventoryLog, LabTest, LabTestParameter, 
    LabTestRequiredItem, LabCategory, LabSupplier, LabPurchase, LabPurchaseItem, LabBatch
)


class LabSupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSupplier
        fields = '__all__'


class LabBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabBatch
        fields = '__all__'


class LabCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LabCategory
        fields = ['id', 'name', 'description']


class LabTestParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTestParameter
        fields = ['id', 'name', 'is_heading', 'unit', 'normal_range', 'description']


class LabTestRequiredItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='inventory_item.item_name', read_only=True)
    
    class Meta:
        model = LabTestRequiredItem
        fields = ['id', 'inventory_item', 'item_name', 'qty_per_test']


class LabTestSerializer(serializers.ModelSerializer):
    parameters = LabTestParameterSerializer(many=True, required=False)
    required_items = LabTestRequiredItemSerializer(many=True, required=False)

    class Meta:
        model = LabTest
        fields = ['id', 'name', 'sub_name', 'category', 'price', 'gender', 'normal_range', 'description', 'parameters', 'required_items']

    def create(self, validated_data):
        parameters_data = validated_data.pop('parameters', [])
        required_items_data = validated_data.pop('required_items', [])
        
        lab_test = LabTest.objects.create(**validated_data)
        
        for param_data in parameters_data:
            LabTestParameter.objects.create(test=lab_test, **param_data)
            
        for item_data in required_items_data:
            LabTestRequiredItem.objects.create(test=lab_test, **item_data)
            
        return lab_test

    def update(self, instance, validated_data):
        parameters_data = validated_data.pop('parameters', None)
        required_items_data = validated_data.pop('required_items', None)
        
        instance.name = validated_data.get('name', instance.name)
        instance.sub_name = validated_data.get('sub_name', instance.sub_name)
        instance.category = validated_data.get('category', instance.category)
        instance.price = validated_data.get('price', instance.price)
        instance.normal_range = validated_data.get('normal_range', instance.normal_range)
        instance.description = validated_data.get('description', instance.description)
        instance.save()

        if parameters_data is not None:
            instance.parameters.all().delete()
            for param_data in parameters_data:
                LabTestParameter.objects.create(test=instance, **param_data)
                
        if required_items_data is not None:
            instance.required_items.all().delete()
            for item_data in required_items_data:
                LabTestRequiredItem.objects.create(test=instance, **item_data)
        
        return instance


class LabInventoryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabInventoryLog
        fields = ['id', 'item', 'transaction_type', 'qty', 'cost', 'performed_by', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class LabInventorySerializer(serializers.ModelSerializer):
    item_id = serializers.IntegerField(source='id', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    logs = LabInventoryLogSerializer(many=True, read_only=True)
    batches = LabBatchSerializer(many=True, read_only=True)

    class Meta:
        model = LabInventory
        fields = [
            'item_id', 'item_name', 'category', 'qty', 'cost_per_unit', 'reorder_level', 
            'is_low_stock', 'logs', 'batches',
            'manufacturer', 'unit', 'is_liquid', 'pack_size', 'items_per_pack',
            'gst_percent', 'discount_percent', 'hsn', 'mrp',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['item_id', 'is_low_stock', 'logs', 'batches', 'created_at', 'updated_at']


class LabPurchaseItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(write_only=True) # Accepting name for creation logic
    category = serializers.CharField(write_only=True, required=False)
    unit = serializers.CharField(write_only=True, required=False)
    is_liquid = serializers.BooleanField(write_only=True, required=False)
    items_per_pack = serializers.IntegerField(write_only=True, required=False, default=1)
    inventory_item_name = serializers.CharField(source='inventory_item.item_name', read_only=True)

    class Meta:
        model = LabPurchaseItem
        fields = '__all__'
        read_only_fields = ['purchase', 'inventory_item', 'batch', 'inventory_item_name', 'created_at', 'updated_at']


class LabPurchaseSerializer(serializers.ModelSerializer):
    purchase_id = serializers.IntegerField(source='id', read_only=True)
    supplier_name = serializers.CharField(source='supplier.supplier_name', read_only=True)
    items = LabPurchaseItemSerializer(many=True, write_only=True)
    items_detail = LabPurchaseItemSerializer(source='items', many=True, read_only=True)

    class Meta:
        model = LabPurchase
        fields = '__all__'
        read_only_fields = ['purchase_id', 'created_by', 'created_at', 'updated_at', 'total_amount', 'supplier_name']

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        
        # Recalculate Total (ignoring frontend total for security/accuracy)
        total_amount = 0
        for item in items_data:
            rate = float(item.get('unit_cost', 0))
            qty = int(item.get('qty', 0))
            gst_percent = float(item.get('gst_percent', 0))
            discount_percent = float(item.get('discount_percent', 0))
            
            # Formula: (Rate * Qty - Discount) + GST
            base_cost = rate * qty
            discount_amt = base_cost * (discount_percent / 100.0)
            taxable = base_cost - discount_amt
            gst_amt = taxable * (gst_percent / 100.0)
            
            total_amount += (taxable + gst_amt)
            
        # Apply Invoice Level Extra Expenses
        cash_discount = float(validated_data.get('cash_discount', 0))
        courier_charge = float(validated_data.get('courier_charge', 0))
        
        total_amount = total_amount - cash_discount + courier_charge
        validated_data['total_amount'] = round(total_amount, 2)
        
        user = None
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user

        purchase = LabPurchase.objects.create(created_by=user, **validated_data)
        
        for item_data in items_data:
            # Extract non-model fields or fields for Inventory creation
            item_name = item_data.pop('item_name')
            category = item_data.pop('category', 'General')
            unit = item_data.pop('unit', 'units')
            is_liquid = item_data.pop('is_liquid', False)
            items_per_pack = item_data.pop('items_per_pack', 1)
            
            # 1. Get/Create Master Inventory
            inventory_item, created = LabInventory.objects.get_or_create(
                item_name=item_name,
                defaults={
                    'category': category,
                    'unit': unit,
                    'is_liquid': is_liquid,
                    'items_per_pack': items_per_pack,
                    'cost_per_unit': item_data.get('unit_cost', 0),
                    'gst_percent': item_data.get('gst_percent', 0),
                    'discount_percent': item_data.get('discount_percent', 0),
                    'mrp': item_data.get('mrp', 0),
                    'qty': 0 # start with 0, will add batch qty
                }
            )
            
            if not created:
                # Update latest cost and details
                inventory_item.cost_per_unit = item_data.get('unit_cost', inventory_item.cost_per_unit)
                inventory_item.is_liquid = is_liquid # Ensure liquid status is updated/consistent
                inventory_item.items_per_pack = items_per_pack
                inventory_item.save()

            # 2. Create Batch
            batch = LabBatch.objects.create(
                inventory_item=inventory_item,
                batch_no=item_data['batch_no'],
                expiry_date=item_data['expiry_date'],
                qty=item_data['qty'],
                mrp=item_data['mrp'],
                purchase_rate=item_data['unit_cost'],
                supplier=purchase.supplier
            )

            # 3. Create Purchase Item Log
            LabPurchaseItem.objects.create(
                purchase=purchase,
                inventory_item=inventory_item,
                batch=batch,
                **item_data
            )
            
            # 4. Update Master Inventory Qty
            inventory_item.qty += item_data['qty']
            inventory_item.save()
            
            # 5. Log Transaction
            LabInventoryLog.objects.create(
                item=inventory_item,
                transaction_type='STOCK_IN',
                qty=item_data['qty'],
                cost=item_data.get('unit_cost', 0),
                performed_by=user.full_name if user and hasattr(user, 'full_name') else str(user),
                notes=f"Purchase Inv: {purchase.supplier_invoice_no}"
            )

        # Emit Socket Event for Real-time Reports
        try:
            from asgiref.sync import async_to_sync
            from revive_cms.sio import sio
            async_to_sync(sio.emit)('lab_inventory_update', {
                'purchase_id': str(purchase.id),
                'amount': float(purchase.total_amount)
            })
        except Exception as e:
            print(f"Socket emit error: {e}")

        return purchase


class LabChargeSerializer(serializers.ModelSerializer):
    lc_id = serializers.IntegerField(source='id', read_only=True)
    visit_id = serializers.IntegerField(source='visit.id', read_only=True)
    patient_name = serializers.CharField(source='visit.patient.full_name', read_only=True)
    registration_number = serializers.CharField(source='visit.patient.registration_number', read_only=True)
    patient_age = serializers.CharField(source='visit.patient.age', read_only=True)
    patient_sex = serializers.CharField(source='visit.patient.gender', read_only=True)
    patient_phone = serializers.CharField(source='visit.patient.phone', read_only=True)
    patient_address = serializers.CharField(source='visit.patient.address', read_only=True)
    doctor_name = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = LabCharge
        fields = [
            'lc_id', 'visit', 'visit_id', 'patient_name', 'registration_number', 'patient_age', 'patient_sex',
            'patient_phone', 'patient_address', 'doctor_name', 'payment_status',
            'test_name', 'sub_name', 'amount', 'status', 'results', 'report_date', 'drawn_date', 'received_date', 'technician_name',
            'specimen', 'created_at', 'updated_at'
        ]
        read_only_fields = ['lc_id', 'created_at', 'updated_at']

    def get_doctor_name(self, obj):
        if obj.visit and obj.visit.doctor:
            return obj.visit.doctor.username
        if obj.visit and obj.visit.referred_by and obj.visit.referred_by.lower() != 'self':
            return obj.visit.referred_by
        return 'Self'

    def get_payment_status(self, obj):
        if not obj.visit:
            return 'UNBILLED'
        invoices = obj.visit.invoices.all()
        if not invoices:
            return 'UNBILLED'
        
        test_invoiced = False
        test_paid = False
        
        for inv in invoices:
            for item in inv.items.all():
                if item.dept == 'LAB' and item.description == obj.test_name:
                    test_invoiced = True
                    if inv.payment_status == 'PAID':
                        test_paid = True
                        break
            if test_paid:
                break
                
        if not test_invoiced:
            return 'UNBILLED'
            
        return 'PAID' if test_paid else 'PENDING'

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        
        if instance.status == 'COMPLETED':
             try:
                from asgiref.sync import async_to_sync
                from revive_cms.sio import sio
                
                async_to_sync(sio.emit)('lab_update', {
                    'lc_id': str(instance.id),
                    'visit_id': str(instance.visit.id),
                    'patient_name': instance.visit.patient.full_name if instance.visit and instance.visit.patient else 'Patient',
                    'status': 'COMPLETED'
                })
             except Exception as e:
                print(f"Socket emit error: {e}")
        return instance
