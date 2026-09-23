from django.contrib import admin
from .models import Invoice, InvoiceItem, PaymentTransaction

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1

class PaymentTransactionInline(admin.TabularInline):
    model = PaymentTransaction
    extra = 0

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'invoice_number', 'visit', 'total_amount', 'payment_status', 'created_at')
    list_filter = ('payment_status', 'created_at')
    inlines = [InvoiceItemInline, PaymentTransactionInline]

@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'invoice', 'amount', 'mode', 'created_at')
    list_filter = ('mode', 'created_at')

