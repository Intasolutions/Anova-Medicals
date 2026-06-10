from django.contrib import admin
from .models import Product, Operation, Employee, InventoryBalance, ProductionLog, ProductSize, Designation

@admin.register(ProductSize)
class ProductSizeAdmin(admin.ModelAdmin):
    list_display = ('size_name', 'display_order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('size_name',)
    ordering = ('display_order', 'size_name')

@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('product_code', 'name', 'price_per_unit', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'product_code')
    ordering = ('name',)

@admin.register(Operation)
class OperationAdmin(admin.ModelAdmin):
    list_display = ('operation_code', 'operation_name')
    search_fields = ('operation_name', 'operation_code')
    ordering = ('operation_code',)

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'name', 'designation')
    list_filter = ('designation',)
    search_fields = ('name', 'employee_code')
    ordering = ('name',)

@admin.register(InventoryBalance)
class InventoryBalanceAdmin(admin.ModelAdmin):
    list_display = ('product', 'balance_qty')
    list_filter = ('product',)
    search_fields = ('product__name', 'product__product_code')
    ordering = ('product',)

@admin.register(ProductionLog)
class ProductionLogAdmin(admin.ModelAdmin):
    list_display = ('work_date', 'employee', 'product', 'operation', 'size', 'quantity', 'amount_earned')
    list_filter = ('work_date', 'employee', 'product', 'operation', 'size')
    search_fields = ('employee__name', 'employee__employee_code', 'product__name', 'product__product_code')
    date_hierarchy = 'work_date'
    ordering = ('-work_date', 'employee')
