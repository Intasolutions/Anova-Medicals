import uuid
import re
from django.db import models
from django.db.models import CheckConstraint, Q, UniqueConstraint
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

# --- Master Data Models ---

class ProductSize(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    size_name = models.CharField(
        max_length=50, 
        unique=True,
        validators=[
            RegexValidator(
                regex='^[a-zA-Z0-9]*$',
                message='Size name must be alphanumeric (no special symbols).',
                code='invalid_size_name'
            )
        ]
    )
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['display_order', 'size_name']
        verbose_name = "Product Size"

    def delete(self, *args, **kwargs):
        # Dependency Check: Check if size is used in Inventory or Production Logs
        if self.inventory_balances.exists() or self.production_logs.exists():
            raise ValidationError(
                f"Cannot delete size '{self.size_name}' because it is currently linked to inventory or production records. Deactivate it instead."
            )
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.size_name

class Designation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def delete(self, *args, **kwargs):
        # Soft delete enforcement
        self.is_active = False
        self.save()
        # Note: We don't call super().delete() to prevent hard delete

    def __str__(self):
        return self.name

# --- Core Business Models ---

class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product_code = models.CharField(max_length=100, unique=True)
    model_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    date = models.DateField(auto_now_add=True, null=True, blank=True)

    class Meta:
        constraints = [
            CheckConstraint(
                condition=Q(price_per_unit__gte=0),
                name="price_per_unit_non_negative"
            )
        ]

    def delete(self, *args, **kwargs):
        if self.production_logs.exists():
            self.is_active = False
            self.save()
            return
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.product_code})"

class Operation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operation_code = models.CharField(max_length=100, unique=True, blank=True)
    operation_name = models.CharField(max_length=255)

    def save(self, *args, **kwargs):
        if not self.operation_code:
            last_op = Operation.objects.filter(operation_code__startswith='OP-').order_by('-operation_code').first()
            if last_op:
                try:
                    last_num = int(last_op.operation_code.split('-')[1])
                    self.operation_code = f"OP-{last_num + 1:03d}"
                except (ValueError, IndexError):
                    self.operation_code = f"OP-001"
            else:
                self.operation_code = f"OP-001"
            
            while Operation.objects.filter(operation_code=self.operation_code).exists():
                last_num = int(self.operation_code.split('-')[1])
                self.operation_code = f"OP-{last_num + 1:03d}"
                
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.operation_name} ({self.operation_code})"

class ProductOperation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product_operations')
    operation = models.ForeignKey(Operation, on_delete=models.CASCADE, related_name='product_operations')
    piece_rate = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        constraints = [
            CheckConstraint(
                condition=Q(piece_rate__gte=0),
                name="piece_rate_non_negative"
            ),
            UniqueConstraint(
                fields=['product', 'operation'],
                name='unique_product_operation'
            )
        ]

    def __str__(self):
        return f"{self.product.name} - {self.operation.operation_name} (Rate: {self.piece_rate})"

class Employee(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    designation = models.ForeignKey(
        Designation, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='employees'
    )
    address = models.TextField(null=True, blank=True)
    contact_number = models.CharField(max_length=20, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    photo = models.ImageField(upload_to='employees/photos/', null=True, blank=True)
    id_proof = models.FileField(upload_to='employees/docs/', null=True, blank=True)
    is_working = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.employee_code})"

class InventoryBalance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inventory_balances')
    size = models.ForeignKey(ProductSize, on_delete=models.CASCADE, related_name='inventory_balances')
    operation = models.ForeignKey(Operation, on_delete=models.CASCADE, related_name='inventory_balances', null=True, blank=True)
    balance_qty = models.IntegerField(default=0)

    class Meta:
        verbose_name_plural = "Inventory Balances"
        constraints = [
            CheckConstraint(
                condition=Q(balance_qty__gte=0),
                name="balance_qty_non_negative"
            ),
            UniqueConstraint(
                fields=['product', 'size', 'operation'],
                name='unique_product_size_operation_inventory'
            )
        ]

    def __str__(self):
        return f"{self.product.name} - {self.size.size_name} - {self.operation.operation_name}: {self.balance_qty}"

class ProductionLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    work_date = models.DateField()
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='production_logs')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='production_logs')
    operation = models.ForeignKey(Operation, on_delete=models.CASCADE, related_name='production_logs')
    size = models.ForeignKey(ProductSize, on_delete=models.PROTECT, related_name='production_logs')
    quantity = models.IntegerField()
    amount_earned = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        constraints = [
            CheckConstraint(
                condition=Q(quantity__gt=0),
                name="quantity_positive"
            )
        ]

    def __str__(self):
        return f"{self.work_date} - {self.employee.name} - {self.product.name} - {self.operation.operation_name}"

class StockOut(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_outs')
    size = models.ForeignKey(ProductSize, on_delete=models.CASCADE, related_name='stock_outs')
    quantity = models.IntegerField()
    out_date = models.DateField(auto_now_add=True)
    recipient = models.CharField(max_length=255, null=True, blank=True)
    remarks = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "Stock Outs"
        constraints = [
            CheckConstraint(
                condition=Q(quantity__gt=0),
                name="stock_out_quantity_positive"
            )
        ]

    def __str__(self):
        return f"{self.out_date} - {self.product.name} ({self.quantity} units)"

class MasterStock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='master_stocks')
    size = models.ForeignKey(ProductSize, on_delete=models.CASCADE, related_name='master_stocks')
    total_quantity = models.IntegerField(default=0)

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=['product', 'size'],
                name='unique_product_size_master_stock'
            )
        ]

    def __str__(self):
        return f"{self.product.name} - {self.size.size_name}: {self.total_quantity}"
