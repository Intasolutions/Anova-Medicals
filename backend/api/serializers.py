from rest_framework import serializers
from .models import Product, Operation, ProductOperation, Employee, InventoryBalance, ProductionLog, ProductSize, Designation, StockOut, MasterStock

class MasterStockSerializer(serializers.ModelSerializer):
    size_name = serializers.ReadOnlyField(source='size.size_name')
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = MasterStock
        fields = '__all__'

class ProductSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSize
        fields = '__all__'

class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    total_operational_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'product_code', 'model_number', 'name', 'price_per_unit', 'photo', 'is_active', 'date', 'total_operational_cost']

class OperationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operation
        fields = '__all__'
        read_only_fields = ['operation_code']

class ProductOperationSerializer(serializers.ModelSerializer):
    operation_name = serializers.ReadOnlyField(source='operation.operation_name')
    operation_code = serializers.ReadOnlyField(source='operation.operation_code')

    class Meta:
        model = ProductOperation
        fields = ['id', 'product', 'operation', 'operation_name', 'operation_code', 'piece_rate']

class EmployeeSerializer(serializers.ModelSerializer):
    designation_name = serializers.ReadOnlyField(source='designation.name')
    
    class Meta:
        model = Employee
        fields = [
            'id', 'employee_code', 'name', 'designation', 'designation_name',
            'address', 'contact_number', 'date_of_birth', 'date_of_joining', 'photo', 'id_proof', 'is_working'
        ]
        extra_kwargs = {
            'contact_number': {'required': True, 'allow_blank': False},
            'address': {'required': True, 'allow_blank': False},
            'designation': {'required': True, 'allow_null': False},
        }

class InventoryBalanceSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    size_name = serializers.ReadOnlyField(source='size.size_name')
    operation_name = serializers.SerializerMethodField()
    operation_code = serializers.SerializerMethodField()

    class Meta:
        model = InventoryBalance
        fields = '__all__'

    def get_operation_name(self, obj):
        return obj.operation.operation_name if obj.operation else "Finished Goods"

    def get_operation_code(self, obj):
        return obj.operation.operation_code if obj.operation else "FINISHED"

class ProductionLogSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.name')
    product_name = serializers.ReadOnlyField(source='product.name')
    model_number = serializers.ReadOnlyField(source='product.model_number')
    operation_name = serializers.ReadOnlyField(source='operation.operation_name')
    size_name = serializers.ReadOnlyField(source='size.size_name')

    class Meta:
        model = ProductionLog
        fields = '__all__'

class StockOutSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    size_name = serializers.ReadOnlyField(source='size.size_name')

    class Meta:
        model = StockOut
        fields = '__all__'
