from django.db.models.signals import post_save
from django.dispatch import receiver
from patients.models import Visit
from .models import Invoice, InvoiceItem

@receiver(post_save, sender=Visit)
def create_or_update_consultation_invoice(sender, instance, created, **kwargs):
    # Determine the correct fee
    amount = 500.00
    if instance.doctor and hasattr(instance.doctor, 'consultation_fee'):
        amount = instance.doctor.consultation_fee
    
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
        # Update existing master invoice if doctor/fee changed
        invoice = Invoice.objects.filter(visit=instance).order_by('created_at').first()
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
            
            # Adjust payment status
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
