import os
import django
import random
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revive_cms.settings')
django.setup()

from patients.models import Patient, Visit
from pharmacy.models import PharmacyStock
from lab.models import LabCharge
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()
print("Starting database seeding...")

# 1. Create a dummy doctor user if not exists
doctor_user, _ = User.objects.get_or_create(username='stress_doctor', defaults={'is_staff': True})

# 2. Generate 100 Fake Patients
print("Seeding Patients...")
first_names = ["John", "Mary", "David", "Sarah", "Michael", "Emma", "James", "Olivia", "William", "Sophia", "Oliver", "Isabella", "Lucas", "Mia", "Henry", "Amelia", "Alexander", "Harper", "Sebastian", "Evelyn"]
last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

patients = []
for i in range(100):
    p = Patient.objects.create(
        full_name=f"{random.choice(first_names)} {random.choice(last_names)} {i}",
        age=random.randint(1, 90),
        gender=random.choice(['Male', 'Female', 'Other']),
        phone=f"9876543{str(i).zfill(3)}",
        address="123 Dummy St, Test City"
    )
    patients.append(p)
print(f"Created {len(patients)} patients.")

# 3. Create Visits
print("Seeding Visits (Reception, Doctor, Lab, Pharmacy queues)...")
roles = ['DOCTOR', 'LAB', 'PHARMACY', 'BILLING']
statuses = ['OPEN', 'OPEN', 'OPEN', 'CLOSED']

visits = []
for idx, p in enumerate(patients):
    v = Visit.objects.create(
        patient=p,
        assigned_role=roles[idx % 4],
        status=statuses[idx % 4],
        doctor=doctor_user
    )
    visits.append(v)
print(f"Created {len(visits)} visits.")

# 4. Create dummy medicines & stock
print("Seeding Pharmacy Stock...")
for i in range(10):
    for j in range(5):
        PharmacyStock.objects.create(
            name=f"Stress Med {i}",
            manufacturer="Stress Pharma",
            category="TABLET",
            medicine_type="TABLET",
            batch_no=f"B-{i}-{j}",
            expiry_date=timezone.now().date() + timedelta(days=300),
            qty_available=1000,
            selling_price=10.0,
            mrp=15.0,
            purchase_rate=5.0,
            tablets_per_strip=10
        )
print("Created Pharmacy Stock.")

# 5. Create Lab Charges for Lab visits
print("Seeding Lab Charges...")
lab_visits = [v for v in visits if v.assigned_role == 'LAB']
for v in lab_visits:
    for _ in range(3):
        LabCharge.objects.create(
            visit=v,
            test_name=f"Stress Test {random.randint(1,20)}",
            amount=50.0,
            status='PENDING'
        )
print("Seeding complete!")
