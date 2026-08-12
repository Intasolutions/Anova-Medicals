from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from core.models import BaseModel


class Patient(BaseModel):
    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )

    full_name = models.CharField(max_length=255)
    registration_number = models.CharField(max_length=50, null=True, blank=True, default='TEMP', help_text="Manual Registration Number")
    age = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    age_months = models.PositiveIntegerField(validators=[MinValueValidator(0)], default=0, help_text="Months (0-11)")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=15)
    address = models.TextField()
    id_proof = models.CharField(max_length=50, blank=True, null=True)
    medical_history = models.TextField(blank=True, null=True, help_text="Pre-existing conditions like BP, Diabetes, etc.")

    def save(self, *args, **kwargs):
        if not self.registration_number or self.registration_number == 'TEMP':
            last_patient = Patient.objects.order_by('created_at').last()
            if last_patient and last_patient.registration_number and last_patient.registration_number.isdigit():
                self.registration_number = str(int(last_patient.registration_number) + 1)
            else:
                self.registration_number = "10001"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.phone})"


class ReferringDoctor(BaseModel):
    name = models.CharField(max_length=255, unique=True, help_text="Name of the referring doctor")
    phone = models.CharField(max_length=20, blank=True, null=True)
    specialization = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.name


class Visit(BaseModel):
    STATUS_CHOICES = (
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('CLOSED', 'Closed'),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='visits')
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_visits'
    )
    referred_by = models.CharField(max_length=255, blank=True, null=True, default='Self', help_text="Referring doctor if external or lab direct")
    assigned_role = models.CharField(
        max_length=20, 
        choices=(
            ('ADMIN', 'Admin'),
            ('RECEPTION', 'Reception'),
            ('DOCTOR', 'Doctor'),
            ('LAB', 'Lab'),
            ('PHARMACY', 'Pharmacy'),
            ('BILLING', 'Billing'),
            ('CASUALTY', 'Casualty'),
        ), 
        default='DOCTOR'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    vitals = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['patient'],
                condition=models.Q(status__in=['OPEN', 'IN_PROGRESS']),
                name='one_active_visit_per_patient',
            ),
        ]

    def __str__(self):
        return f"Visit {self.id} - {self.patient.full_name}"

    @property
    def calculated_consultation_fee(self):
        if not self.doctor:
            return 0.00
            
        from django.utils import timezone
        from datetime import timedelta
        from billing.models import Invoice
        
        created_at = self.created_at or timezone.now()
        visit_date = created_at.date()
        seven_days_ago_date = visit_date - timedelta(days=7)
        
        # Check for a previous paid consultation with the SAME doctor within the last 7 calendar days
        recent_paid_consultation = Invoice.objects.filter(
            patient=self.patient,
            payment_status__in=['PAID', 'PARTIAL'],
            visit__created_at__date__gte=seven_days_ago_date,
            visit__created_at__lt=created_at,
            visit__doctor=self.doctor,
            items__dept='CONSULTATION',
            items__unit_price__gt=0
        ).exclude(visit=self).exists()
        
        if recent_paid_consultation:
            return 0.00
            
        if hasattr(self.doctor, 'consultation_fee'):
            return float(self.doctor.consultation_fee)
        return 0.00
