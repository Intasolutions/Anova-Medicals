from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
import random
import string
from datetime import timedelta

# Auth
from django.contrib.auth import get_user_model
User = get_user_model()

# Patients
from patients.models import Patient, Visit

# Lab
from lab.models import LabCategory, LabTest, LabInventory, LabSupplier, LabBatch, LabTestParameter

# Pharmacy
from pharmacy.models import Supplier as PharmacySupplier, PharmacyStock, PurchaseInvoice, PurchaseItem

# Medical
from medical.models import DoctorNote

# Casualty
from casualty.models import CasualtyServiceDefinition, CasualtyService, CasualtyMedicine, CasualtyObservation, CasualtyLog

# Billing
from billing.models import Invoice, InvoiceItem, PaymentTransaction


class Command(BaseCommand):
    help = 'Populates the database with dummy data for all modules (Users, Patients, Lab, Pharmacy, Casualty, Medical, Billing)'

    def handle(self, *args, **options):
        self.stdout.write('Starting comprehensive dummy data population...')

        with transaction.atomic():
            self.create_staff_users()
            self.populate_lab_data()
            self.populate_pharmacy_data()
            self.create_patients_and_visits()
            self.populate_casualty_data()
            self.create_medical_and_billing_data()

        self.stdout.write(self.style.SUCCESS('Successfully populated dummy data across all modules.'))

    def create_staff_users(self):
        self.stdout.write('Creating Staff Users...')
        roles = [
            ('admin_user', 'ADMIN'),
            ('reception_user', 'RECEPTION'),
            ('doctor_user', 'DOCTOR'),
            ('lab_user', 'LAB'),
            ('pharmacy_user', 'PHARMACY'),
            ('casualty_user', 'CASUALTY')
        ]

        for username, role in roles:
            if not User.objects.filter(username=username).exists():
                User.objects.create_user(
                    username=username,
                    password='password123',
                    email=f'{username}@revive.local',
                    role=role,
                    first_name=role.capitalize(),
                    last_name='Staff'
                )

    def populate_lab_data(self):
        self.stdout.write('Populating Lab data...')
        categories = ['Hematology', 'Biochemistry', 'Microbiology', 'Pathology', 'Serology']
        cat_objs = {}
        for cat_name in categories:
            obj, _ = LabCategory.objects.get_or_create(name=cat_name, defaults={'description': f'{cat_name} tests'})
            cat_objs[cat_name] = obj

        suppliers = ['MediLab Supplies', 'BioTech Distributors', 'LabCorp India']
        for name in suppliers:
            LabSupplier.objects.get_or_create(
                supplier_name=name,
                defaults={'phone': '9876543210', 'address': '123 Lab St', 'gst_no': '29ABCDE1234F1Z5'}
            )

        tests = [
            {'name': 'Complete Blood Count', 'sub_name': 'CBC', 'category': 'Hematology', 'price': 350.00, 'params': [
                {"name": "Hemoglobin", "unit": "g/dL", "normal_range": "13.5-17.5"},
                {"name": "WBC Count", "unit": "cells/mcL", "normal_range": "4500-11000"},
            ]},
            {'name': 'Blood Glucose Fasting', 'sub_name': 'FBS', 'category': 'Biochemistry', 'price': 100.00, 'params': [
                {"name": "Glucose", "unit": "mg/dL", "normal_range": "70-100"}
            ]},
            {'name': 'Lipid Profile', 'sub_name': '', 'category': 'Biochemistry', 'price': 800.00, 'params': [
                {"name": "Total Cholesterol", "unit": "mg/dL", "normal_range": "<200"},
                {"name": "HDL Cholesterol", "unit": "mg/dL", "normal_range": ">40"},
            ]},
        ]

        for test_data in tests:
            params = test_data.pop("params")
            test_obj, _ = LabTest.objects.get_or_create(
                name=test_data['name'],
                defaults={
                    'sub_name': test_data['sub_name'],
                    'category': test_data['category'],
                    'price': Decimal(str(test_data['price'])),
                    'normal_range': 'N/A'
                }
            )
            for p in params:
                LabTestParameter.objects.get_or_create(
                    test=test_obj,
                    name=p['name'],
                    defaults={'unit': p['unit'], 'normal_range': p['normal_range']}
                )

        inventory_items = [
            {'name': 'CBC Reagent Kit', 'cat': 'Reagent', 'cost': 5000.00},
            {'name': 'Glucose Strips', 'cat': 'Consumable', 'cost': 2500.00},
            {'name': 'Microscope Slides', 'cat': 'Glassware', 'cost': 200.00},
        ]
        for item in inventory_items:
            inv_obj, created = LabInventory.objects.get_or_create(
                item_name=item['name'],
                defaults={'category': item['cat'], 'cost_per_unit': Decimal(str(item['cost'])), 'qty': 100, 'reorder_level': 20}
            )
            if created or not inv_obj.batches.exists():
                LabBatch.objects.create(
                    inventory_item=inv_obj,
                    batch_no=f'BATCH-{random.randint(1000, 9999)}',
                    expiry_date=timezone.now().date() + timedelta(days=365),
                    qty=50,
                    mrp=Decimal(str(item['cost'] * 1.5)),
                    purchase_rate=Decimal(str(item['cost']))
                )


    def populate_pharmacy_data(self):
        self.stdout.write('Populating Pharmacy data...')
        suppliers = ['HealthFine Pharma', 'CureWell Distributors', 'City Pharma Agency']
        supplier_objs = []
        for name in suppliers:
            obj, _ = PharmacySupplier.objects.get_or_create(
                supplier_name=name,
                defaults={'phone': '9988776655', 'address': '456 Pharma Rd', 'gst_no': '29VWXYZ9876A1Z3'}
            )
            supplier_objs.append(obj)

        medicines = [
            {'name': 'Paracetamol 500mg', 'type': 'TABLET', 'mrp': 2.00, 'sp': 2.00, 'ptr': 1.50, 'gst': 12},
            {'name': 'Amoxicillin 500mg', 'type': 'TABLET', 'mrp': 10.00, 'sp': 10.00, 'ptr': 7.50, 'gst': 12},
            {'name': 'Cough Syrup 100ml', 'type': 'SYRUP', 'mrp': 120.00, 'sp': 120.00, 'ptr': 90.00, 'gst': 12},
            {'name': 'Cetirizine 10mg', 'type': 'TABLET', 'mrp': 5.00, 'sp': 5.00, 'ptr': 3.00, 'gst': 12},
        ]

        for i, supp in enumerate(supplier_objs):
            inv_no = f"INV-{timezone.now().year}-{1000 + i}"
            invoice, created = PurchaseInvoice.objects.get_or_create(
                supplier=supp,
                supplier_invoice_no=inv_no,
                defaults={
                    'invoice_date': timezone.now().date(),
                    'purchase_type': 'CASH',
                    'total_amount': Decimal('0.00'),
                    'status': 'COMPLETED'
                }
            )
            if created:
                for med in random.sample(medicines, 2):
                    batch_no = f'BAT-{timezone.now().year}-{random.randint(100, 999)}'
                    expiry = timezone.now().date() + timedelta(days=random.randint(180, 730))
                    qty = random.randint(50, 200)
                    ptr = Decimal(str(med['ptr']))
                    gst_pct = Decimal(str(med['gst']))

                    gross = ptr * qty
                    gst_amount = gross * (gst_pct / Decimal(100))
                    item_total = gross + gst_amount

                    tps = 10 if med['type'] == 'TABLET' else 1

                    PurchaseItem.objects.create(
                        purchase=invoice,
                        product_name=med['name'],
                        batch_no=batch_no,
                        expiry_date=expiry,
                        medicine_type=med['type'],
                        qty=qty,
                        purchase_rate=ptr,
                        mrp=Decimal(str(med['mrp'])),
                        ptr=ptr,
                        gst_percent=gst_pct,
                        taxable_amount=gross,
                        gst_amount=gst_amount,
                        total_amount=item_total,
                        tablets_per_strip=tps
                    )

                    PharmacyStock.objects.get_or_create(
                        name=med['name'],
                        batch_no=batch_no,
                        defaults={
                            'expiry_date': expiry,
                            'mrp': Decimal(str(med['mrp'])),
                            'selling_price': Decimal(str(med['sp'])),
                            'purchase_rate': ptr,
                            'ptr': ptr,
                            'qty_available': qty * tps,
                            'reorder_level': 50,
                            'medicine_type': med['type'],
                            'supplier': supp,
                            'gst_percent': gst_pct,
                            'manufacturer': 'Generic Pharma',
                            'tablets_per_strip': tps
                        }
                    )
                invoice.calculate_distribution()

    def create_patients_and_visits(self):
        self.stdout.write('Creating Patients and Visits...')
        first_names = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda']
        last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
        
        doctor = User.objects.filter(role='DOCTOR').first()

        for i in range(20):
            patient, created = Patient.objects.get_or_create(
                phone=f"9{random.randint(100000000, 999999999)}",
                defaults={
                    'full_name': f"{random.choice(first_names)} {random.choice(last_names)}",
                    'registration_number': f"OP-{timezone.now().year}-{random.randint(1000, 9999)}",
                    'age': random.randint(10, 80),
                    'age_months': 0,
                    'gender': random.choice(['M', 'F']),
                    'address': f"{random.randint(1, 999)} Main Street",
                }
            )

            # Create an open visit for a few patients
            if i % 3 == 0 and doctor:
                Visit.objects.get_or_create(
                    patient=patient,
                    doctor=doctor,
                    status='OPEN',
                    defaults={
                        'assigned_role': 'DOCTOR',
                        'vitals': {'bp': '120/80', 'temp': '98.6', 'pulse': '72'}
                    }
                )

    def populate_casualty_data(self):
        self.stdout.write('Populating Casualty data...')
        
        services = [
            {'name': 'Emergency Consultation', 'charge': 1000.00},
            {'name': 'Dressing', 'charge': 250.00},
            {'name': 'ECG', 'charge': 300.00},
            {'name': 'Minor Suture', 'charge': 500.00}
        ]
        
        service_objs = []
        for s in services:
            obj, _ = CasualtyServiceDefinition.objects.get_or_create(
                name=s['name'],
                defaults={'base_charge': Decimal(str(s['charge']))}
            )
            service_objs.append(obj)

        # Grab a random visit to assign casualty data
        visit = Visit.objects.filter(status='OPEN').first()
        if not visit:
            return

        # Add Log
        CasualtyLog.objects.get_or_create(
            visit=visit,
            defaults={
                'transfer_path': 'Brought by ambulance',
                'treatment_notes': 'Patient arrived with minor lacerations. Suturing done.',
                'vitals': {'bp': '130/85', 'pulse': '90'}
            }
        )
        
        # Add Service
        service_def = random.choice(service_objs)
        CasualtyService.objects.get_or_create(
            visit=visit,
            service_definition=service_def,
            defaults={
                'qty': 1,
                'unit_charge': service_def.base_charge,
                'total_charge': service_def.base_charge
            }
        )

        # Add Medicine
        stock = PharmacyStock.objects.first()
        if stock:
            CasualtyMedicine.objects.get_or_create(
                visit=visit,
                med_stock=stock,
                defaults={
                    'qty': 1,
                    'unit_price': stock.selling_price,
                    'total_price': stock.selling_price,
                    'dosage': '1-stat'
                }
            )
            
        # Add Observation
        CasualtyObservation.objects.get_or_create(
            visit=visit,
            defaults={
                'planned_duration_minutes': 120,
                'observation_notes': 'Observe for 2 hours post-suturing.'
            }
        )


    def create_medical_and_billing_data(self):
        self.stdout.write('Populating Medical & Billing data...')
        visit = Visit.objects.filter(status='OPEN').exclude(casualty_logs__isnull=False).first()
        if not visit:
            return

        # Doctor Note
        DoctorNote.objects.get_or_create(
            visit=visit,
            defaults={
                'diagnosis': 'Viral Fever',
                'prescription': [
                    {'medicine': 'Paracetamol 500mg', 'dosage': '1-1-1', 'duration': '5 Days'}
                ],
                'notes': 'Advised rest and plenty of fluids.'
            }
        )

        # Invoice
        total = Decimal('1500.00')
        invoice, created = Invoice.objects.get_or_create(
            visit=visit,
            defaults={
                'patient_name': visit.patient.full_name,
                'total_amount': total,
                'payment_status': 'PAID',
                'payment_mode': 'CASH',
                'remarks': 'Consultation & Pharmacy'
            }
        )

        if created:
            InvoiceItem.objects.create(
                invoice=invoice,
                dept='CONSULTATION',
                description='Doctor Consultation Fee',
                qty=1,
                unit_price=Decimal('500.00'),
                amount=Decimal('500.00')
            )
            InvoiceItem.objects.create(
                invoice=invoice,
                dept='PHARMACY',
                description='Medicines Breakdown',
                qty=1,
                unit_price=Decimal('1000.00'),
                amount=Decimal('1000.00')
            )
            PaymentTransaction.objects.create(
                invoice=invoice,
                amount=total,
                mode='CASH',
                remarks='Paid in full at counter'
            )
