import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from lab.models import LabCharge
from django.db.models import Count

print("Total LabCharges:", LabCharge.objects.count())

# Try to find a patient that has some lab charges
charges = LabCharge.objects.all()
if charges.exists():
    c = charges.first()
    patient_id = c.visit.patient.id
    print(f"Testing filter for Patient ID {patient_id}")
    
    # Emulate the viewset
    qs = LabCharge.objects.all().order_by('-created_at')
    qs_filtered = qs.filter(visit__patient_id=patient_id)
    
    print(f"Filtered count using visit__patient_id={patient_id}: {qs_filtered.count()}")
else:
    print("No lab charges found.")
