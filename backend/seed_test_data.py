"""
Seeds realistic test data across Reception, Doctor, Pharmacy, Lab, Casualty and
Billing so the app can be clicked through end-to-end on the LOCAL dev database.

Run from the backend/ directory:
    python seed_test_data.py

Safe to re-run: each run creates a fresh batch of patients/visits, it does not
touch or delete existing data.
"""
import os
import django
import random
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revive_cms.settings')
django.setup()

from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from decimal import Decimal

# Refuse to run against anything that isn't the local sqlite dev database.
db = settings.DATABASES['default']
if db['ENGINE'] != 'django.db.backends.sqlite3':
    raise SystemExit(f"Refusing to seed: DB engine is '{db['ENGINE']}', not sqlite3. "
                      f"This script only runs against the local dev database.")
print(f"Seeding local database: {db['NAME']}")

from patients.models import Patient, Visit
from medical.models import DoctorNote
from pharmacy.models import PharmacyStock, PharmacySale, PharmacySaleItem, PharmacyReturn, PharmacyReturnItem
from pharmacy.serializers import PharmacyReturnSerializer
from lab.models import LabCharge
from casualty.models import CasualtyServiceDefinition, CasualtyService, CasualtyMedicine, CasualtyObservation
from billing.models import Invoice, InvoiceItem, PaymentTransaction

User = get_user_model()

# ---------------------------------------------------------------------------
# 1. Users (doctor, reception, pharmacy, lab staff) -- only create if missing
# ---------------------------------------------------------------------------
def get_or_create_staff(username, role):
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'is_staff': True, 'role': role} if hasattr(User, 'role') else {'is_staff': True}
    )
    if created:
        user.set_password('testpass123')
        if hasattr(user, 'role'):
            user.role = role
        user.save()
    return user

doctor = get_or_create_staff('seed_doctor_noble', 'DOCTOR')
receptionist = get_or_create_staff('seed_reception', 'RECEPTION')
pharmacist = get_or_create_staff('seed_pharmacist', 'PHARMACY')
lab_tech = get_or_create_staff('seed_labtech', 'LAB')
print(f"Staff ready: {doctor.username}, {receptionist.username}, {pharmacist.username}, {lab_tech.username}")

# ---------------------------------------------------------------------------
# 2. Patients
# ---------------------------------------------------------------------------
first_names = ["Ravi", "Anjali", "Suresh", "Priya", "Manoj", "Divya", "Arjun", "Meera", "Vijay", "Lakshmi"]
last_names = ["Kumar", "Nair", "Menon", "Pillai", "Iyer", "Reddy", "Rao", "Varma", "Nambiar", "Das"]

patients = []
for i in range(12):
    p = Patient.objects.create(
        full_name=f"{random.choice(first_names)} {random.choice(last_names)}",
        age=random.randint(5, 85),
        gender=random.choice(['M', 'F']),
        phone=f"98765{40000 + i:05d}",
        address="Seed Test Address, Kerala",
        medical_history=random.choice(["", "Diabetes", "Hypertension", "None known"]),
    )
    patients.append(p)
print(f"Created {len(patients)} patients.")

# ---------------------------------------------------------------------------
# 3. Pharmacy stock (varied medicines, some low stock, some near expiry)
# ---------------------------------------------------------------------------
medicine_catalog = [
    ("Paracetamol 500mg", "TABLET", 10),
    ("Amoxicillin 500mg", "CAPSULE", 12),
    ("Cetirizine 10mg", "TABLET", 5),
    ("Pantoprazole 40mg", "TABLET", 5),
    ("Azithromycin 500mg", "TABLET", 12),
    ("Cough Syrup", "SYRUP", 0),
    ("ORS Powder", "POWDER", 0),
    ("Diclofenac Gel", "GEL", 0),
]

stocks = []
for name, med_type, gst in medicine_catalog:
    for batch_suffix in ["A", "B"]:  # two batches per medicine, to exercise the merge-by-name fix
        stock = PharmacyStock.objects.create(
            name=name,
            manufacturer="Seed Pharma Ltd",
            category=med_type,
            medicine_type=med_type,
            batch_no=f"SEED-{name[:3].upper()}-{batch_suffix}",
            expiry_date=timezone.now().date() + timedelta(days=random.choice([30, 90, 400])),
            qty_available=random.randint(20, 300),
            selling_price=Decimal(str(round(random.uniform(2, 25), 2))),
            mrp=Decimal(str(round(random.uniform(2, 25), 2))),
            purchase_rate=Decimal("1.50"),
            tablets_per_strip=10 if med_type in ("TABLET", "CAPSULE") else 1,
            gst_percent=Decimal(str(gst)),
        )
        stocks.append(stock)
print(f"Created {len(stocks)} pharmacy stock batches across {len(medicine_catalog)} medicines.")

# ---------------------------------------------------------------------------
# 4. Casualty service definitions
# ---------------------------------------------------------------------------
service_defs = []
for name, charge in [("IV Fluid Administration", 150), ("Wound Dressing", 100), ("Observation (per hour)", 500), ("Nebulization", 120)]:
    sd, _ = CasualtyServiceDefinition.objects.get_or_create(name=name, defaults={'base_charge': Decimal(str(charge))})
    service_defs.append(sd)
print(f"Ready {len(service_defs)} casualty service definitions.")

# ---------------------------------------------------------------------------
# 5. Build visits with realistic scenarios per patient
# ---------------------------------------------------------------------------
complaints_pool = ["Fever and headache", "Cough and cold", "Abdominal pain", "Body ache", "Skin rash"]
diagnosis_pool = ["Viral fever", "Upper respiratory tract infection", "Gastritis", "Allergic reaction", "Musculoskeletal pain"]

created_visits = {
    'doctor_only': [],
    'pharmacy_with_duplicate': [],
    'lab_pending': [],
    'casualty_repeat_service': [],
    'billing_partial': [],
    'billing_refunded': [],
}

from billing.serializers import InvoiceSerializer

def make_invoice_for_visit(visit, items, discount=Decimal('0'), pay_ratio=1.0):
    """
    Routes through the real InvoiceSerializer (same path the app itself uses),
    so this exercises the actual merge-by-description logic and correctly
    reuses whatever invoice billing/signals.py already auto-created for this
    visit (every Visit with a doctor gets one via the post_save signal) --
    creating a second invoice directly would desync from that signal-owned one.
    """
    payload = {
        'visit': visit.id, 'patient': visit.patient.id, 'patient_name': visit.patient.full_name,
        'total_amount': 0, 'discount_amount': str(discount), 'payment_status': 'PENDING',
        'items': [{**it, 'unit_price': str(it['unit_price']), 'amount': str(it['amount'])} for it in items],
    }
    s = InvoiceSerializer(data=payload)
    s.is_valid(raise_exception=True)
    inv = s.save()

    balance = inv.total_amount - discount
    pay_amount = (balance * Decimal(str(pay_ratio))).quantize(Decimal('0.01'))
    if pay_amount > 0:
        PaymentTransaction.objects.create(invoice=inv, amount=pay_amount, mode=random.choice(['CASH', 'UPI', 'CARD']))
    paid_so_far = sum(p.amount for p in inv.payments.all())
    if paid_so_far >= balance - Decimal('0.5'):
        inv.payment_status = 'PAID'
    elif paid_so_far > 0:
        inv.payment_status = 'PARTIAL'
    inv.save()
    return inv

for idx, p in enumerate(patients):
    scenario = idx % 6

    if scenario == 0:
        # Doctor consultation only, closed visit, with a doctor note + prescription
        v = Visit.objects.create(patient=p, doctor=doctor, assigned_role='DOCTOR', status='CLOSED')
        DoctorNote.objects.create(
            visit=v,
            complaints=random.choice(complaints_pool),
            examination="Stable, no acute distress",
            diagnosis=random.choice(diagnosis_pool),
            notes="Advised rest and follow-up if symptoms persist.",
            prescription={"Paracetamol 500mg": "1-0-1 | 5 | Qty: 10"},
        )
        # Visit has a doctor -> billing/signals.py already auto-created the invoice
        # with a "General Consultation Fee" line; nothing more to add here.
        inv = Invoice.objects.filter(visit=v).first()
        if inv and inv.total_amount > 0:
            PaymentTransaction.objects.create(invoice=inv, amount=inv.total_amount, mode='CASH')
            inv.payment_status = 'PAID'
            inv.save()
        created_visits['doctor_only'].append(v)

    elif scenario == 1:
        # Pharmacy visit with the SAME medicine dispensed from two different batches
        # -- exercises the merge-by-name billing fix from this session.
        v = Visit.objects.create(patient=p, doctor=doctor, assigned_role='PHARMACY', status='CLOSED')
        DoctorNote.objects.create(
            visit=v, complaints=random.choice(complaints_pool), examination="Mild symptoms",
            diagnosis=random.choice(diagnosis_pool), notes="",
            prescription={"Amoxicillin 500mg": "1-0-1 | 5 | Qty: 10"},
        )
        amox_a = PharmacyStock.objects.filter(name="Amoxicillin 500mg", batch_no__endswith="-A").first()
        amox_b = PharmacyStock.objects.filter(name="Amoxicillin 500mg", batch_no__endswith="-B").first()
        sale = PharmacySale.objects.create(visit=v, patient=p, total_amount=Decimal('0'), payment_status='PENDING')
        si1 = PharmacySaleItem.objects.create(sale=sale, med_stock=amox_a, qty=10, unit_price=amox_a.selling_price, amount=(amox_a.selling_price * 10).quantize(Decimal('0.01')), gst_percent=amox_a.gst_percent)
        si2 = PharmacySaleItem.objects.create(sale=sale, med_stock=amox_b, qty=6, unit_price=amox_b.selling_price, amount=(amox_b.selling_price * 6).quantize(Decimal('0.01')), gst_percent=amox_b.gst_percent)
        sale.total_amount = si1.amount + si2.amount
        sale.payment_status = 'PAID'
        sale.save()
        # Visit has a doctor -> signal already created the invoice with the
        # consultation fee line; append the two pharmacy batches to it, which
        # should merge into ONE "Amoxicillin 500mg" line (qty 16, ignoring batch).
        make_invoice_for_visit(v, [
            {'dept': 'PHARMACY', 'description': 'Amoxicillin 500mg', 'qty': 10, 'unit_price': si1.unit_price, 'amount': si1.amount, 'batch': amox_a.batch_no, 'gst_percent': amox_a.gst_percent},
            {'dept': 'PHARMACY', 'description': 'Amoxicillin 500mg', 'qty': 6, 'unit_price': si2.unit_price, 'amount': si2.amount, 'batch': amox_b.batch_no, 'gst_percent': amox_b.gst_percent},
        ], pay_ratio=1.0)
        created_visits['pharmacy_with_duplicate'].append(v)

    elif scenario == 2:
        # Lab referral, still pending (nothing collected yet)
        v = Visit.objects.create(patient=p, doctor=doctor, assigned_role='LAB', status='OPEN')
        DoctorNote.objects.create(
            visit=v, complaints=random.choice(complaints_pool), examination="Advised lab workup",
            diagnosis="Under investigation", notes="", lab_referral_details="CBC, Blood Sugar Fasting",
        )
        LabCharge.objects.create(visit=v, test_name="Complete Blood Count", amount=Decimal('250.00'), status='PENDING')
        LabCharge.objects.create(visit=v, test_name="Blood Sugar Fasting", amount=Decimal('80.00'), status='PENDING')
        created_visits['lab_pending'].append(v)

    elif scenario == 3:
        # Casualty visit with the SAME service given twice -- exercises the
        # repeat-service merge fix.
        v = Visit.objects.create(patient=p, assigned_role='CASUALTY', status='CLOSED')
        iv_service = CasualtyServiceDefinition.objects.get(name="IV Fluid Administration")
        cs1 = CasualtyService.objects.create(visit=v, service_definition=iv_service, qty=1, unit_charge=iv_service.base_charge, total_charge=iv_service.base_charge, status='COMPLETED')
        cs2 = CasualtyService.objects.create(visit=v, service_definition=iv_service, qty=1, unit_charge=iv_service.base_charge, total_charge=iv_service.base_charge, status='COMPLETED')
        make_invoice_for_visit(v, [
            {'dept': 'CASUALTY', 'description': iv_service.name, 'qty': 1, 'unit_price': iv_service.base_charge, 'amount': iv_service.base_charge},
            {'dept': 'CASUALTY', 'description': iv_service.name, 'qty': 1, 'unit_price': iv_service.base_charge, 'amount': iv_service.base_charge},
        ], pay_ratio=1.0)
        created_visits['casualty_repeat_service'].append(v)

    elif scenario == 4:
        # Partially paid invoice with a discount -- exercises balance_due / dashboard pending fix
        v = Visit.objects.create(patient=p, doctor=doctor, assigned_role='BILLING', status='OPEN')
        DoctorNote.objects.create(
            visit=v, complaints=random.choice(complaints_pool), examination="Reviewed",
            diagnosis=random.choice(diagnosis_pool), notes="",
        )
        # Signal already added the consultation fee line; append a lab charge on top.
        make_invoice_for_visit(v, [
            {'dept': 'LAB', 'description': 'Lipid Profile', 'qty': 1, 'unit_price': Decimal('400.00'), 'amount': Decimal('400.00')},
        ], discount=Decimal('50.00'), pay_ratio=0.4)
        created_visits['billing_partial'].append(v)

    else:
        # Fully paid pharmacy sale, then a partial return -- exercises the
        # refund-reflected-in-balance-and-history fix.
        v = Visit.objects.create(patient=p, doctor=doctor, assigned_role='PHARMACY', status='CLOSED')
        cetirizine = PharmacyStock.objects.filter(name="Cetirizine 10mg", batch_no__endswith="-A").first()
        sale = PharmacySale.objects.create(visit=v, patient=p, total_amount=Decimal('0'), payment_status='PAID')
        si = PharmacySaleItem.objects.create(sale=sale, med_stock=cetirizine, qty=10, unit_price=cetirizine.selling_price, amount=(cetirizine.selling_price * 10).quantize(Decimal('0.01')), gst_percent=cetirizine.gst_percent)
        sale.total_amount = si.amount
        sale.save()
        # Signal already added the consultation fee line; append the pharmacy sale.
        inv = make_invoice_for_visit(v, [
            {'dept': 'PHARMACY', 'description': 'Cetirizine 10mg', 'qty': 10, 'unit_price': si.unit_price, 'amount': si.amount, 'batch': cetirizine.batch_no, 'gst_percent': cetirizine.gst_percent},
        ], pay_ratio=1.0)

        class _FakeReq:
            user = pharmacist
        ret_serializer = PharmacyReturnSerializer(
            data={'sale': sale.id, 'reason': 'Patient reported mild side effects', 'items_data': [{'sale_item_id': si.id, 'qty': 4}]},
            context={'request': _FakeReq()},
        )
        ret_serializer.is_valid(raise_exception=True)
        ret_serializer.save()
        created_visits['billing_refunded'].append(v)

print("\nCreated visit scenarios:")
for k, v in created_visits.items():
    print(f"  {k}: {len(v)} visit(s) -- patient(s): {[vv.patient.full_name for vv in v]}")

print("\nSeeding complete.")
print("Login as: seed_doctor_noble / seed_reception / seed_pharmacist / seed_labtech (password: testpass123)")
print("Or use the admin superuser created earlier: admin / testpass123")
