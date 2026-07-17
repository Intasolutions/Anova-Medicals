import os, sys, django
from datetime import timedelta
from django.utils import timezone
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revive_cms.settings')
django.setup()

from users.models import User
from patients.models import Patient, Visit
from lab.models import LabCategory, LabTest, LabInventory, LabSupplier
from pharmacy.models import PharmacyStock, Supplier as PharmSupplier
from casualty.models import CasualtyServiceDefinition

print("--- Seeding Users ---")
roles = ['DOCTOR', 'RECEPTION', 'PHARMACY', 'LAB', 'CASUALTY', 'ADMIN']
for role in roles:
    username = role.lower()
    if not User.objects.filter(username=username).exists():
        u = User.objects.create_user(username=username, password=f"{username}123", role=role, first_name=f"Dr. {role.title()}" if role == 'DOCTOR' else f"{role.title()} Staff", last_name="")
        print(f"Created user: {username}")

print("--- Seeding Lab Data ---")
lab_cats = ['Hematology', 'Biochemistry', 'Microbiology', 'Pathology']
for cat in lab_cats:
    c, created = LabCategory.objects.get_or_create(name=cat)
    if created:
        print(f"Created Lab Category: {cat}")

hematology = LabCategory.objects.get(name='Hematology')
biochem = LabCategory.objects.get(name='Biochemistry')

lab_tests = [
    {"category": hematology, "name": "Complete Blood Count (CBC)", "price": 500},
    {"category": biochem, "name": "Fasting Blood Sugar (FBS)", "price": 250},
    {"category": biochem, "name": "Lipid Profile", "price": 800}
]
for t in lab_tests:
    obj, created = LabTest.objects.get_or_create(name=t['name'], defaults=t)
    if created: print(f"Created Lab Test: {t['name']}")

print("--- Seeding Pharmacy Data ---")
pharm_stocks = [
    {"name": "Paracetamol 500mg", "medicine_type": "TABLET", "qty_available": 1000, "mrp": 2, "selling_price": 2, "purchase_rate": 1, "reorder_level": 200, "batch_no": "B1", "expiry_date": timezone.now().date() + timedelta(days=365)},
    {"name": "Amoxicillin 250mg", "medicine_type": "TABLET", "qty_available": 500, "mrp": 5, "selling_price": 5, "purchase_rate": 3, "reorder_level": 100, "batch_no": "B2", "expiry_date": timezone.now().date() + timedelta(days=365)},
    {"name": "Nebulization Tube", "medicine_type": "OTHER", "qty_available": 200, "mrp": 85, "selling_price": 85, "purchase_rate": 50, "reorder_level": 50, "batch_no": "B3", "expiry_date": timezone.now().date() + timedelta(days=365)},
    {"name": "Cetirizine 10mg", "medicine_type": "TABLET", "qty_available": 800, "mrp": 3, "selling_price": 3, "purchase_rate": 1, "reorder_level": 150, "batch_no": "B4", "expiry_date": timezone.now().date() + timedelta(days=365)},
    {"name": "Syringe 5ml", "medicine_type": "OTHER", "qty_available": 2000, "mrp": 5, "selling_price": 5, "purchase_rate": 3, "reorder_level": 500, "batch_no": "B5", "expiry_date": timezone.now().date() + timedelta(days=365)},
]

for i in pharm_stocks:
    obj, created = PharmacyStock.objects.get_or_create(name=i['name'], defaults=i)
    if created: print(f"Created Pharmacy Stock: {i['name']}")

print("--- Seeding Services ---")
services = [
    {"name": "ECG", "base_charge": 150, "description": "Electrocardiogram"},
    {"name": "GRBS", "base_charge": 50, "description": "Random Blood Sugar"},
    {"name": "Nursing Charges", "base_charge": 200, "description": "Basic nursing care per day"},
    {"name": "Nebulization", "base_charge": 100, "description": "Nebulization administration"},
]

for s in services:
    obj, created = CasualtyServiceDefinition.objects.get_or_create(name=s['name'], defaults=s)
    if created: print(f"Created Service: {s['name']}")

print("--- Seeding Patients & Visits ---")
patients = [
    {"full_name": "John Doe", "phone": "9000000001", "age": 45, "gender": "M", "address": "Downtown"},
    {"full_name": "Jane Smith", "phone": "9000000002", "age": 32, "gender": "F", "address": "Uptown"},
    {"full_name": "Alice Johnson", "phone": "9000000003", "age": 28, "gender": "F", "address": "Suburbs"}
]

for p in patients:
    patient, created = Patient.objects.get_or_create(phone=p['phone'], defaults=p)
    if created:
        print(f"Created Patient: {patient.full_name}")
        # Create a recent visit for them
        Visit.objects.create(
            patient=patient,
            assigned_role='RECEPTION',
            status='OPEN'
        )
        print(f"  -> Created Visit for {patient.full_name}")

print("=== ALL SEEDING COMPLETE ===")
