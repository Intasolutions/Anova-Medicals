from django.db import models
from core.models import BaseModel
from patients.models import Visit

class Invoice(BaseModel):
    PAYMENT_STATUS = (('DRAFT', 'Draft'), ('PAID', 'Paid'), ('PARTIAL', 'Partial'), ('PENDING', 'Pending'), ('CANCELLED', 'Cancelled'))
    visit = models.ForeignKey(Visit, on_delete=models.SET_NULL, null=True, related_name='invoices')
    patient = models.ForeignKey('patients.Patient', on_delete=models.SET_NULL, null=True, blank=True, related_name='direct_invoices')
    patient_name = models.CharField(max_length=255, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, default='PENDING', choices=PAYMENT_STATUS)
    payment_mode = models.CharField(max_length=20, null=True, blank=True, choices=(('CASH', 'Cash'), ('UPI', 'Google Pay / UPI'), ('CARD', 'Card')))
    remarks = models.TextField(null=True, blank=True)
    invoice_number = models.CharField(max_length=50, unique=True, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Take the HIGHEST existing number, not the most recently created row.
            # Ordering by created_at picks the newest row, whose number is not
            # necessarily the largest -- when they fall out of order that hands
            # back an already-used number and the save fails on the unique
            # constraint, which the staff member just sees as an error.
            existing = Invoice.objects.exclude(
                invoice_number__isnull=True
            ).exclude(invoice_number="").values_list('invoice_number', flat=True)
            numbers = [int(n) for n in existing if str(n).isdigit()]
            self.invoice_number = str(max(numbers) + 1) if numbers else "20001"
        super().save(*args, **kwargs)

    def recalculate_total(self, save=True):
        """
        Re-add this invoice's line items and store the result.

        Deliberately queries InvoiceItem directly instead of using
        ``self.items.all()``. The viewset loads invoices with
        ``prefetch_related('items')``, which caches the item list on the
        instance -- so after adding or deleting rows, ``self.items.all()``
        returns the list as it was BEFORE the change and the total comes out
        stale (e.g. a Rs631.32 bill saving as Rs500).
        """
        from django.db.models import Sum
        total = (
            InvoiceItem.objects.filter(invoice=self)
            .aggregate(total=Sum('amount'))['total']
            or 0
        )
        self.total_amount = total
        if save:
            self.save()
        return total

    def __str__(self):
        return f"{self.invoice_number or self.id} - {self.total_amount}"

class InvoiceItem(BaseModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    item_id = models.BigIntegerField(null=True, blank=True) # Generic reference to source (lab, pharmacy op)
    dept = models.CharField(max_length=50) # 'PHARMACY', 'LAB', 'CONSULTATION', 'CASUALTY'
    description = models.CharField(max_length=255)
    
    # Detailed Billing Fields
    qty = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    hsn = models.CharField(max_length=20, null=True, blank=True)
    batch = models.CharField(max_length=50, null=True, blank=True)
    expiry = models.CharField(max_length=20, null=True, blank=True) # Store as string for flexibility in manual entry
    dosage = models.CharField(max_length=50, null=True, blank=True) # e.g. "1-0-1"
    duration = models.CharField(max_length=50, null=True, blank=True) # e.g. "5 Days"
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    stock_deducted = models.BooleanField(default=False)
    deducted_qty = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.dept}: {self.description}"

class PaymentTransaction(BaseModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    mode = models.CharField(max_length=20, choices=(('CASH', 'Cash'), ('UPI', 'Google Pay / UPI'), ('CARD', 'Card')))
    remarks = models.TextField(null=True, blank=True)
    transaction_id = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"{self.mode}: {self.amount} for Inv #{self.invoice.id}"
