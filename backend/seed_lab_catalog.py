"""
Seeds the Lab test catalogue (categories + tests + their parameters) so the
Doctor / Lab / Billing screens have something to actually pick from in the UI.

The transactional seed script (seed_test_data.py) creates patients, visits and
charges, but it does NOT populate this master catalogue -- without it the
doctor's "add lab test" search box comes up empty and the lab flow can't be
clicked through in the browser.

Run from the backend/ directory:
    python seed_lab_catalog.py

Safe to re-run: uses get_or_create, so it won't duplicate existing tests.
"""
import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revive_cms.settings')
django.setup()

from django.conf import settings

db = settings.DATABASES['default']
if db['ENGINE'] != 'django.db.backends.sqlite3':
    raise SystemExit(
        f"Refusing to seed: DB engine is '{db['ENGINE']}', not sqlite3. "
        f"This script only runs against the local dev database."
    )
print(f"Seeding lab catalogue into: {db['NAME']}")

from lab.models import LabCategory, LabTest, LabTestParameter

# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
CATEGORIES = [
    ("HAEMATOLOGY", "Blood cell counts and related studies"),
    ("BIOCHEMISTRY", "Blood chemistry, sugars, lipids, organ panels"),
    ("SEROLOGY", "Antibody / antigen based tests"),
    ("CLINICAL PATHOLOGY", "Urine, stool and body fluid examination"),
    ("RADIOLOGY", "Imaging studies"),
]
for name, desc in CATEGORIES:
    LabCategory.objects.get_or_create(name=name, defaults={'description': desc})
print(f"Categories ready: {LabCategory.objects.count()}")

# ---------------------------------------------------------------------------
# Tests: (name, category, price, [(parameter, unit, normal_range), ...])
# ---------------------------------------------------------------------------
TESTS = [
    ("Complete Blood Count (CBC)", "HAEMATOLOGY", "250.00", [
        ("Haemoglobin", "g/dL", "13.0 - 17.0 (M) / 12.0 - 15.0 (F)"),
        ("Total WBC Count", "cells/cumm", "4000 - 11000"),
        ("Platelet Count", "lakhs/cumm", "1.5 - 4.5"),
        ("RBC Count", "million/cumm", "4.5 - 5.5"),
        ("PCV / Haematocrit", "%", "40 - 50"),
    ]),
    ("Erythrocyte Sedimentation Rate (ESR)", "HAEMATOLOGY", "100.00", [
        ("ESR", "mm/hr", "0 - 15 (M) / 0 - 20 (F)"),
    ]),
    ("Blood Sugar Fasting (FBS)", "BIOCHEMISTRY", "80.00", [
        ("Fasting Blood Sugar", "mg/dL", "70 - 100"),
    ]),
    ("Blood Sugar Post Prandial (PPBS)", "BIOCHEMISTRY", "80.00", [
        ("Post Prandial Blood Sugar", "mg/dL", "Less than 140"),
    ]),
    ("HbA1c (Glycated Haemoglobin)", "BIOCHEMISTRY", "450.00", [
        ("HbA1c", "%", "4.0 - 5.6 (Normal) / 5.7 - 6.4 (Pre-diabetic)"),
    ]),
    ("Lipid Profile", "BIOCHEMISTRY", "600.00", [
        ("Total Cholesterol", "mg/dL", "Up to 200"),
        ("Triglycerides", "mg/dL", "Up to 150"),
        ("HDL Cholesterol", "mg/dL", "40 - 60"),
        ("LDL Cholesterol", "mg/dL", "Up to 100"),
        ("VLDL Cholesterol", "mg/dL", "10 - 30"),
    ]),
    ("Liver Function Test (LFT)", "BIOCHEMISTRY", "700.00", [
        ("Total Bilirubin", "mg/dL", "0.3 - 1.2"),
        ("Direct Bilirubin", "mg/dL", "0.0 - 0.3"),
        ("SGOT (AST)", "U/L", "5 - 40"),
        ("SGPT (ALT)", "U/L", "5 - 41"),
        ("Alkaline Phosphatase", "U/L", "40 - 129"),
        ("Total Protein", "g/dL", "6.4 - 8.3"),
    ]),
    ("Renal Function Test (RFT)", "BIOCHEMISTRY", "650.00", [
        ("Blood Urea", "mg/dL", "15 - 40"),
        ("Serum Creatinine", "mg/dL", "0.6 - 1.2"),
        ("Uric Acid", "mg/dL", "3.5 - 7.2"),
        ("Sodium", "mEq/L", "135 - 145"),
        ("Potassium", "mEq/L", "3.5 - 5.1"),
    ]),
    ("Thyroid Profile (T3 T4 TSH)", "BIOCHEMISTRY", "500.00", [
        ("T3 (Triiodothyronine)", "ng/dL", "80 - 200"),
        ("T4 (Thyroxine)", "ug/dL", "5.1 - 14.1"),
        ("TSH", "uIU/mL", "0.27 - 4.20"),
    ]),
    ("Urine Routine Examination", "CLINICAL PATHOLOGY", "120.00", [
        ("Colour", "", "Pale Yellow"),
        ("Albumin", "", "Nil"),
        ("Sugar", "", "Nil"),
        ("Pus Cells", "/hpf", "0 - 5"),
        ("Epithelial Cells", "/hpf", "0 - 5"),
    ]),
    ("Dengue NS1 Antigen", "SEROLOGY", "800.00", [
        ("Dengue NS1", "", "Negative"),
    ]),
    ("Widal Test", "SEROLOGY", "300.00", [
        ("S. Typhi O", "", "Less than 1:80"),
        ("S. Typhi H", "", "Less than 1:160"),
    ]),
    ("Chest X-Ray (PA View)", "RADIOLOGY", "350.00", []),
    ("ECG", "RADIOLOGY", "150.00", []),
]

created_tests = {}
for name, category, price, params in TESTS:
    test, created = LabTest.objects.get_or_create(
        name=name,
        defaults={
            'category': category,
            'price': Decimal(price),
            'gender': 'B',
        },
    )
    created_tests[name] = test
    if created:
        for pname, unit, nrange in params:
            LabTestParameter.objects.create(
                test=test, name=pname, unit=unit, normal_range=nrange
            )

print(f"Tests ready: {LabTest.objects.count()} (parameters: {LabTestParameter.objects.count()})")

# ---------------------------------------------------------------------------
# One package test, to exercise the parent/sub-test billing path
# ---------------------------------------------------------------------------
pkg, pkg_created = LabTest.objects.get_or_create(
    name="Master Health Checkup Package",
    defaults={
        'category': 'BIOCHEMISTRY',
        'price': Decimal('1500.00'),
        'gender': 'B',
        'is_package': True,
    },
)
if pkg_created or not pkg.package_tests.exists():
    pkg.is_package = True
    pkg.save()
    for child in ["Complete Blood Count (CBC)", "Lipid Profile",
                  "Liver Function Test (LFT)", "Blood Sugar Fasting (FBS)"]:
        if child in created_tests:
            pkg.package_tests.add(created_tests[child])
    print(f"Package '{pkg.name}' -> {pkg.package_tests.count()} bundled tests")

print("\nLab catalogue seeding complete.")
print("You can now search these tests from the Doctor screen when ordering lab work.")
