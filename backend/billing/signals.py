from django.db.models.signals import post_save
from django.dispatch import receiver
from patients.models import Visit
from lab.models import LabCharge
from .models import Invoice, InvoiceItem

# An invoice is still "open" (safe to modify) in any of these states.
OPEN_INVOICE_STATUSES = ['DRAFT', 'PENDING', 'PARTIAL']


@receiver(post_save, sender=LabCharge)
def sync_lab_charge_to_invoice(sender, instance, created, **kwargs):
    """
    Put a lab test on the patient's bill the moment it is ordered -- never wait
    for the test to be completed.

    Ordering the test is the billable event: the patient has committed to it and
    must pay for it. Whether the result is ready yet is the lab's own workflow
    (tracked on LabCharge.status) and has nothing to do with billing. Waiting for
    COMPLETED meant a test could be ordered, the patient could pay and leave, and
    the charge would only appear on the bill afterwards -- with nobody left to
    collect it.
    """
    if not instance.visit:
        return

    # Package sub-tests carry amount 0 (the cost sits on the parent test).
    amount = instance.amount or 0
    if float(amount) <= 0:
        return

    open_invoice = Invoice.objects.filter(
        visit=instance.visit,
        payment_status__in=OPEN_INVOICE_STATUSES,
    ).order_by('created_at').first()

    # A cancelled test must come back off the bill.
    if instance.status == 'CANCELLED':
        if open_invoice:
            deleted, _ = InvoiceItem.objects.filter(
                invoice=open_invoice, dept='LAB', description=instance.test_name
            ).delete()
            if deleted:
                open_invoice.total_amount = sum(i.amount for i in open_invoice.items.all())
                open_invoice.save()
        return

    # No open bill to add to -- either this visit has none yet (e.g. a walk-in
    # lab patient with no consultation), or the previous one is already settled
    # and this is a new charge the patient now owes for. Either way it needs a
    # bill of its own so it can't go uncollected.
    if not open_invoice:
        open_invoice = Invoice.objects.create(
            visit=instance.visit,
            patient=instance.visit.patient,
            patient_name=instance.visit.patient.full_name if instance.visit.patient else 'Unknown',
            total_amount=0,
            payment_status='PENDING',
        )

    already_billed = InvoiceItem.objects.filter(
        invoice=open_invoice, dept='LAB', description=instance.test_name
    ).exists()
    if not already_billed:
        InvoiceItem.objects.create(
            invoice=open_invoice,
            dept='LAB',
            description=instance.test_name,
            qty=1,
            unit_price=amount,
            amount=amount,
        )
        open_invoice.total_amount = sum(i.amount for i in open_invoice.items.all())
        open_invoice.save()

@receiver(post_save, sender=Visit)
def create_or_update_consultation_invoice(sender, instance, created, **kwargs):
    # Determine the correct fee
    amount = float(instance.calculated_consultation_fee)
    
    if created and instance.doctor:
        # Create new invoice
        invoice = Invoice.objects.create(
            visit=instance,
            patient_name=instance.patient.full_name,
            total_amount=amount,
            payment_status='PENDING'
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            dept='CONSULTATION',
            description='General Consultation Fee',
            amount=amount,
            unit_price=amount
        )
    else:
        # Update existing master invoice if doctor/fee changed.
        # Only ever touch an invoice that's still open (PENDING/PARTIAL/DRAFT) --
        # this signal fires on EVERY Visit.save() anywhere in the app (including
        # the visit-close step after a payment is collected), so it must never
        # recalculate an invoice that's already PAID/CANCELLED, and if a visit
        # somehow has more than one invoice, it should never touch a settled one.
        invoice = Invoice.objects.filter(
            visit=instance,
            payment_status__in=['PENDING', 'PARTIAL', 'DRAFT'],
        ).order_by('created_at').first()
        if invoice:
            cons_item = InvoiceItem.objects.filter(invoice=invoice, dept='CONSULTATION').first()

            if instance.doctor:
                if cons_item:
                    # If the amount differs (e.g. doctor assigned/changed), update it
                    if cons_item.amount != amount:
                        cons_item.amount = amount
                        cons_item.unit_price = amount
                        cons_item.save()
                else:
                    # Add consultation item if missing
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        dept='CONSULTATION',
                        description='General Consultation Fee',
                        amount=amount,
                        unit_price=amount
                    )
            else:
                # If no doctor is assigned but a consultation item exists, remove it
                if cons_item:
                    cons_item.delete()

            # Update Invoice Total
            invoice.total_amount = sum(item.amount for item in invoice.items.all())

            # Adjust payment status -- must subtract refund_amount too, matching
            # the same balance formula used everywhere else (get_balance_due,
            # add_payment), so this signal can't disagree with them.
            paid_amount = sum(p.amount for p in invoice.payments.all())
            discount = invoice.discount_amount or 0
            refund = invoice.refund_amount or 0

            if invoice.total_amount == 0:
                invoice.payment_status = 'PENDING'
            elif paid_amount >= invoice.total_amount - discount - refund:
                invoice.payment_status = 'PAID'
            elif paid_amount > 0:
                invoice.payment_status = 'PARTIAL'
            else:
                invoice.payment_status = 'PENDING'

            invoice.save()
