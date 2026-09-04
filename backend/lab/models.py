import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from core.models import BaseModel
from patients.models import Visit


class LabSupplier(BaseModel):
    supplier_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    gst_no = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.supplier_name


class LabInventory(BaseModel):
    item_name = models.CharField(max_length=255)
    category = models.CharField(max_length=50)
    # Stock on hand, expressed in `unit` (ml for liquids, pieces for solids).
    # Decimal so a liquid can hold part-used volumes like 495.5 ml -- an integer
    # field made "5 bottles of 100ml" indistinguishable from "5 ml", and using
    # 5ml of reagent wiped out all five bottles.
    qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    reorder_level = models.PositiveIntegerField(default=10)
    # Container size in `unit`: 50 strips per box, or 100 ml per bottle.
    # Decimal so a 2.5 ml vial is representable.
    items_per_pack = models.DecimalField(max_digits=12, decimal_places=3, default=1)

    # New Premium Fields
    manufacturer = models.CharField(max_length=255, blank=True)
    # Default supplier for this item. Uses the SHARED supplier list managed by
    # admin (pharmacy.Supplier) so there is one directory of suppliers for the
    # whole clinic rather than a separate lab-only one. SET_NULL so removing a
    # supplier never deletes stock records.
    supplier = models.ForeignKey('pharmacy.Supplier', on_delete=models.SET_NULL,
                                 null=True, blank=True, related_name='lab_inventory_items')
    UNIT_CHOICES = (
        ('units', 'Units'),
        ('ml', 'ml (millilitre)'),
        ('litre', 'Litre'),
        ('strips', 'Strips'),
        ('tests', 'Tests'),
        ('vials', 'Vials'),
        ('bottles', 'Bottles'),
        ('boxes', 'Boxes'),
        ('packs', 'Packs'),
        ('pieces', 'Pieces'),
        ('grams', 'Grams'),
    )
    unit = models.CharField(max_length=50, choices=UNIT_CHOICES, default='units')
    is_liquid = models.BooleanField(default=False)
    pack_size = models.CharField(max_length=50, blank=True) # e.g. "1x100ml"
    
    # Financial defaults
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    hsn = models.CharField(max_length=20, blank=True)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return self.item_name

    @property
    def is_low_stock(self):
        return self.qty <= self.reorder_level

    @property
    def packs_remaining(self):
        """
        Stock expressed in whole containers, e.g. 495 ml with a 100 ml bottle
        size reads as 4.95 bottles. Returns None when the item isn't packaged
        (items_per_pack of 1 means the unit IS the container).
        """
        size = self.items_per_pack or 1
        if size <= 1:
            return None
        return round(float(self.qty) / float(size), 2)

    @property
    def qty_display(self):
        """Human-readable stock, e.g. '495 ml (4.95 x 100ml)'."""
        qty = float(self.qty)
        qty_txt = ('%g' % qty)
        base = '%s %s' % (qty_txt, self.unit)
        packs = self.packs_remaining
        if packs is not None:
            return '%s (%g x %g%s)' % (base, packs, float(self.items_per_pack), self.unit)
        return base

    class Meta:
        indexes = [
            models.Index(fields=['item_name']),
        ]


class LabBatch(BaseModel):
    """
    Specific batches of LabInventory items.
    Used for FIFO consumption and expiry tracking.
    """
    inventory_item = models.ForeignKey(LabInventory, on_delete=models.CASCADE, related_name='batches')
    # Optional: many lab consumables (tubes, gloves, bottles) carry no batch
    # number or expiry at all. Stock without an expiry still counts towards the
    # total and is consumed last, after everything that can actually expire.
    batch_no = models.CharField(max_length=50, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    
    # In the item's unit (ml for liquids), decimal so part-used stock is exact.
    qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    purchase_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    supplier = models.ForeignKey('pharmacy.Supplier', on_delete=models.SET_NULL,
                                 null=True, blank=True, related_name='lab_batches')

    class Meta:
        indexes = [
            models.Index(fields=['inventory_item', 'expiry_date']),
        ]

    def __str__(self):
        return f"{self.inventory_item.item_name} ({self.batch_no})"


class LabPurchase(BaseModel):
    PURCHASE_TYPE_CHOICES = (
        ('CASH', 'Cash'),
        ('CREDIT', 'Credit'),
    )

    supplier = models.ForeignKey('pharmacy.Supplier', on_delete=models.PROTECT,
                                 related_name='lab_purchases')
    supplier_invoice_no = models.CharField(max_length=50)
    invoice_date = models.DateField()
    credit_days = models.PositiveIntegerField(default=0)
    purchase_type = models.CharField(max_length=10, choices=PURCHASE_TYPE_CHOICES)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    
    # Extra Expenses
    cash_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    courier_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['invoice_date']),
        ]

    def __str__(self):
        return f"Inv {self.supplier_invoice_no} - {self.supplier.supplier_name}"


class LabPurchaseItem(BaseModel):
    purchase = models.ForeignKey(LabPurchase, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(LabInventory, on_delete=models.CASCADE, related_name='purchase_items')
    batch = models.ForeignKey(LabBatch, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Optional, matching LabBatch: many consumables carry no batch or expiry.
    batch_no = models.CharField(max_length=50, blank=True)
    expiry_date = models.DateField(null=True, blank=True)

    # Decimal, in the item's unit -- a purchase can be 500.5 ml.
    qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)  # Quantity purchased
    free_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    
    mrp = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]) # Purchase Rate
    
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.inventory_item.item_name} - {self.qty}"


class LabInventoryLog(BaseModel):
    TRANSACTION_CHOICES = (
        ('STOCK_IN', 'Stock In'),
        ('STOCK_OUT', 'Stock Out'),
    )

    item = models.ForeignKey(LabInventory, on_delete=models.CASCADE, related_name='logs')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_CHOICES)
    # In the item's unit; decimal so a 2.5 ml consumption is recorded exactly.
    qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    # For Stock In: Cost per unit or total cost. Interpreted as Total Cost for the batch.
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    performed_by = models.CharField(max_length=255, blank=True, null=True) # Name of user
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.item.item_name} - {self.transaction_type} - {self.qty}"


class LabCharge(BaseModel):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('DRAWN', 'Sample Drawn'),
        ('RECEIVED', 'Sample Received'),
        ('VERIFICATION', 'Pending Verification'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name='lab_charges')
    test_name = models.CharField(max_length=255)
    sub_name = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    parent_charge = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='sub_charges')
    
    # Store dynamic test results (e.g. {"Cholesterol": {"value": "142", "unit": "mg/dl", "normal": "Up to 200 mg/dl"}})
    results = models.JSONField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True, help_text="Overall notes for the lab test")
    report_date = models.DateTimeField(null=True, blank=True)
    drawn_date = models.DateTimeField(null=True, blank=True)
    received_date = models.DateTimeField(null=True, blank=True)
    technician_name = models.CharField(max_length=255, blank=True, null=True)
    specimen = models.CharField(max_length=100, default='BLOOD', blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['visit', 'status']),
            models.Index(fields=['test_name']),
        ]

    def __str__(self):
        return f"{self.test_name} - {getattr(self.visit, 'id', self.visit.id)}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-sync timestamps to parent package (Longest duration / latest timestamp wins)
        if self.parent_charge:
            parent = self.parent_charge
            siblings = list(parent.sub_charges.all())
            
            drawn_dates = [s.drawn_date for s in siblings if s.drawn_date]
            received_dates = [s.received_date for s in siblings if s.received_date]
            report_dates = [s.report_date for s in siblings if s.report_date]
            
            max_drawn = max(drawn_dates) if drawn_dates else None
            max_received = max(received_dates) if received_dates else None
            max_report = max(report_dates) if report_dates else None
            
            update_fields = []
            if max_drawn and parent.drawn_date != max_drawn:
                parent.drawn_date = max_drawn
                update_fields.append('drawn_date')
            if max_received and parent.received_date != max_received:
                parent.received_date = max_received
                update_fields.append('received_date')
            if max_report and parent.report_date != max_report:
                parent.report_date = max_report
                update_fields.append('report_date')
                
            if update_fields:
                parent.save(update_fields=update_fields)


class LabCategory(BaseModel):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class LabTest(BaseModel):
    name = models.CharField(max_length=255)
    sub_name = models.CharField(max_length=255, blank=True, null=True)
    category = models.CharField(max_length=50) # Managed via LabCategory, but kept loose for flexibility
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    gender = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female'), ('B', 'Both')], default='B')
    normal_range = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True, help_text="Common description/interpretation for the whole test")
    is_package = models.BooleanField(default=False)
    package_tests = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='packages')

    class Meta:
        indexes = [
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"{self.name} ({self.category})"


class LabTestParameter(BaseModel):
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE, related_name='parameters')
    name = models.CharField(max_length=255)
    is_heading = models.BooleanField(default=False, help_text="If True, this acts as a subheading (unit/range ignored)")
    unit = models.CharField(max_length=50, blank=True, null=True)
    normal_range = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True, help_text="Description box under this parameter")

    def __str__(self):
        return f"{self.name} ({self.test.name})"


class LabTestRequiredItem(BaseModel):
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE, related_name='required_items')
    inventory_item = models.ForeignKey(LabInventory, on_delete=models.CASCADE)
    # Amount consumed per test, in the item's own unit (e.g. 2.5 ml).
    qty_per_test = models.DecimalField(max_digits=12, decimal_places=3, default=1)

    def __str__(self):
        return f"{self.test.name} needs {self.qty_per_test} {self.inventory_item.unit} of {self.inventory_item.item_name}"
