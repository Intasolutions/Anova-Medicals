import uuid
from django.db import models
from core.models import BaseModel
from patients.models import Visit


class DoctorNote(BaseModel):
    # If you want ONLY one note per visit:
    visit = models.OneToOneField(Visit, on_delete=models.CASCADE, related_name='doctor_note')

    complaints = models.TextField(blank=True, default='')
    examination = models.TextField(blank=True, default='')
    diagnosis = models.TextField(blank=True, default='')
    prescription = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    lab_referral_details = models.TextField(blank=True)

    def __str__(self):
        return f"Note for Visit {getattr(self.visit, 'id', self.visit.id)}"



