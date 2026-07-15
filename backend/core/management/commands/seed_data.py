"""
Comprehensive seed command for Anova Medicals clinic system.
"""
from datetime import date, timedelta, datetime
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Seeds all modules with realistic demo data."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== Anova Medicals - Seeding Demo Data ==="))
        try:
            with transaction.atomic():
                self._clear_data()
                users = self._seed_users()
                patients = self._seed_patients()
                visits = self._seed_visits(patients, users)
                self._seed_doctor_notes(visits)
                lab_tests = self._seed_lab_master()
                self._seed_lab_charges(visits, lab_tests)
                pharma_stocks = self._seed_pharmacy_stock()
                self._seed_pharmacy_purchases(users, pharma_stocks)
                self._seed_pharmacy_sales(visits, pharma_stocks, patients)
                self._seed_casualty(visits, pharma_stocks)
                self._seed_billing(visits)
            self.stdout.write(self.style.SUCCESS("All demo data seeded successfully!"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
            raise

    def _clear_data(self):
        self.stdout.write("  Clearing data...")
        from billing.models import PaymentTransaction, InvoiceItem, Invoice
        from casualty.models import CasualtyObservation, CasualtyMedicine, CasualtyService, CasualtyServiceDefinition, CasualtyLog
        from pharmacy.models import PharmacyReturnItem, PharmacyReturn, PharmacySaleItem, PharmacySale, PurchaseItem, PurchaseInvoice, PharmacyStock, Supplier
        from lab.models import LabCharge, LabTestRequiredItem, LabTestParameter, LabTest, LabCategory, LabInventoryLog, LabPurchaseItem, LabPurchase, LabBatch, LabInventory, LabSupplier
        from medical.models import DoctorNote
        from patients.models import Visit, Patient
        from users.models import User
        PaymentTransaction.objects.all().delete()
        InvoiceItem.objects.all().delete()
        Invoice.objects.all().delete()
        CasualtyObservation.objects.all().delete()
        CasualtyMedicine.objects.all().delete()
        CasualtyService.objects.all().delete()
        CasualtyServiceDefinition.objects.all().delete()
        CasualtyLog.objects.all().delete()
        PharmacyReturnItem.objects.all().delete()
        PharmacyReturn.objects.all().delete()
        PharmacySaleItem.objects.all().delete()
        PharmacySale.objects.all().delete()
        PurchaseItem.objects.all().delete()
        PurchaseInvoice.objects.all().delete()
        PharmacyStock.objects.all().delete()
        Supplier.objects.all().delete()
        LabCharge.objects.all().delete()
        LabTestRequiredItem.objects.all().delete()
        LabTestParameter.objects.all().delete()
        LabTest.objects.all().delete()
        LabCategory.objects.all().delete()
        LabInventoryLog.objects.all().delete()
        LabPurchaseItem.objects.all().delete()
        LabPurchase.objects.all().delete()
        LabBatch.objects.all().delete()
        LabInventory.objects.all().delete()
        LabSupplier.objects.all().delete()
        DoctorNote.objects.all().delete()
        Visit.objects.all().delete()
        Patient.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write(self.style.SUCCESS("  Cleared."))

    def _seed_users(self):
        from users.models import User
        self.stdout.write("  Seeding users...")
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(username="admin", email="admin@anova.com", password="admin123", first_name="Admin", last_name="User", role="ADMIN")
        data = [
            ("reception1", "Meena",    "Pillai",  "RECEPTION", "meena@anova.com",   0),
            ("doctor1",    "Arjun",    "Nair",    "DOCTOR",    "arjun@anova.com",   500),
            ("doctor2",    "Priya",    "Menon",   "DOCTOR",    "priya@anova.com",   600),
            ("lab1",       "Rajan",    "Thomas",  "LAB",       "rajan@anova.com",   0),
            ("pharma1",    "Sunitha",  "Varma",   "PHARMACY",  "sunitha@anova.com", 0),
            ("casualty1",  "Binu",     "Joseph",  "CASUALTY",  "binu@anova.com",    0),
        ]
        users = {}
        for username, first, last, role, email, fee in data:
            u = User.objects.create_user(username=username, password="pass1234", first_name=first, last_name=last, role=role, email=email, consultation_fee=fee)
            users[username] = u
        self.stdout.write(self.style.SUCCESS(f"  Created {len(users)+1} users."))
        return users

    def _seed_patients(self):
        from patients.models import Patient
        self.stdout.write("  Seeding patients...")
        data = [
            ("Rajesh Kumar",    "REG-001", 45, "M", "9876543001", "12 MG Road, Kochi"),
            ("Anitha Suresh",   "REG-002", 32, "F", "9876543002", "5 Palarivattom, Ernakulam"),
            ("Mohammed Farhan", "REG-003", 28, "M", "9876543003", "88 Kaloor Junction, Kochi"),
            ("Lekha Menon",     "REG-004", 55, "F", "9876543004", "23 Thrissur Road, Aluva"),
            ("Suresh Babu",     "REG-005", 62, "M", "9876543005", "7 Padivattom, Ernakulam"),
            ("Divya Thomas",    "REG-006", 25, "F", "9876543006", "44 Edappally, Kochi"),
            ("Ravi Shankar",    "REG-007", 38, "M", "9876543007", "9 Kakkanad, Ernakulam"),
            ("Preethi Nair",    "REG-008", 29, "F", "9876543008", "3 Vyttila, Kochi"),
            ("Thomas George",   "REG-009", 70, "M", "9876543009", "60 Muvattupuzha, Kerala"),
            ("Sameera Begum",   "REG-010", 41, "F", "9876543010", "15 Aluva Town, Kerala"),
        ]
        patients = [Patient.objects.create(full_name=n, registration_number=r, age=a, gender=g, phone=ph, address=ad) for n,r,a,g,ph,ad in data]
        self.stdout.write(self.style.SUCCESS(f"  Created {len(patients)} patients."))
        return patients

    def _seed_visits(self, patients, users):
        from patients.models import Visit
        self.stdout.write("  Seeding visits...")
        d1 = users["doctor1"]
        d2 = users["doctor2"]
        vn = {"bp": "120/80", "pulse": "72", "temp": "98.6", "spo2": "99", "weight": "70"}
        vf = {"bp": "118/76", "pulse": "88", "temp": "101.2", "spo2": "98", "weight": "65"}
        configs = [
            (0, d1, "CLOSED",      "DOCTOR",   vn),
            (1, d1, "CLOSED",      "DOCTOR",   vf),
            (2, d2, "CLOSED",      "DOCTOR",   vn),
            (3, d2, "IN_PROGRESS", "PHARMACY", vf),
            (4, d1, "IN_PROGRESS", "LAB",      vn),
            (5, d1, "OPEN",        "DOCTOR",   vn),
            (6, d2, "OPEN",        "DOCTOR",   vn),
            (7, d1, "CLOSED",      "DOCTOR",   vf),
            (8, d2, "CLOSED",      "CASUALTY", vn),
            (9, d1, "IN_PROGRESS", "BILLING",  vn),
        ]
        visits = [Visit.objects.create(patient=patients[i], doctor=doc, status=st, assigned_role=role, vitals=vit) for i,doc,st,role,vit in configs]
        self.stdout.write(self.style.SUCCESS(f"  Created {len(visits)} visits."))
        return visits

    def _seed_doctor_notes(self, visits):
        from medical.models import DoctorNote
        self.stdout.write("  Seeding doctor notes...")
        notes = [
            (0, "Hypertension Stage 1",
             [{"name": "Amlodipine 5mg", "dosage": "1-0-0", "duration": "30 Days"}, {"name": "Aspirin 75mg", "dosage": "0-0-1", "duration": "30 Days"}],
             "Patient advised low salt diet and exercise.", "CBC, RFT"),
            (1, "Acute Viral Fever",
             [{"name": "Paracetamol 500mg", "dosage": "1-1-1", "duration": "5 Days"}, {"name": "Cetirizine 10mg", "dosage": "0-0-1", "duration": "5 Days"}],
             "Rest advised. Return if fever persists.", ""),
            (2, "Type 2 Diabetes",
             [{"name": "Metformin 500mg", "dosage": "1-0-1", "duration": "30 Days"}, {"name": "Glimepiride 1mg", "dosage": "1-0-0", "duration": "30 Days"}],
             "HbA1c: 7.8%. Diet counselling done.", "HbA1c, Lipid"),
            (7, "Acute Gastroenteritis",
             [{"name": "ORS Sachet", "dosage": "As needed", "duration": "3 Days"}, {"name": "Domperidone 10mg", "dosage": "1-1-1", "duration": "3 Days"}],
             "IV fluids. Discharge after observation.", ""),
            (8, "RTA - Minor Laceration",
             [{"name": "Tetanus Toxoid", "dosage": "Single dose", "duration": "1 Day"}, {"name": "Amoxicillin 500mg", "dosage": "1-1-1", "duration": "7 Days"}],
             "Wound cleaned. X-ray normal.", ""),
        ]
        count = 0
        for vi, diag, presc, note, lab_ref in notes:
            DoctorNote.objects.create(visit=visits[vi], diagnosis=diag, prescription=presc, notes=note, lab_referral_details=lab_ref)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"  Created {count} doctor notes."))

    def _seed_lab_master(self):
        from lab.models import LabCategory, LabTest, LabTestParameter, LabInventory, LabSupplier, LabBatch
        self.stdout.write("  Seeding lab master data...")
        LabCategory.objects.create(name="Hematology",   description="Blood cell studies")
        LabCategory.objects.create(name="Biochemistry",  description="Chemical analysis")
        LabCategory.objects.create(name="Microbiology",  description="Pathogen testing")
        LabCategory.objects.create(name="Serology",      description="Antibody tests")

        def make_test(name, cat, price, params):
            t = LabTest.objects.create(name=name, category=cat, price=price, gender="B")
            for pname, unit, normal in params:
                LabTestParameter.objects.create(test=t, name=pname, unit=unit, normal_range=normal)
            return t

        tests = {
            "CBC":    make_test("Complete Blood Count", "Hematology",   250, [("WBC","K/uL","4.0-11.0"),("RBC","M/uL","4.5-5.5"),("Hemoglobin","g/dL","12.0-17.0"),("Platelets","K/uL","150-400")]),
            "RFT":    make_test("Renal Function Test",  "Biochemistry", 350, [("Creatinine","mg/dL","0.7-1.2"),("Urea","mg/dL","10-40"),("Uric Acid","mg/dL","3.5-7.2")]),
            "LFT":    make_test("Liver Function Test",  "Biochemistry", 400, [("SGOT","U/L","<40"),("SGPT","U/L","<40"),("Total Bilirubin","mg/dL","0.2-1.2")]),
            "HbA1c":  make_test("HbA1c",                "Biochemistry", 300, [("HbA1c","%","<5.7")]),
            "Lipid":  make_test("Lipid Profile",        "Biochemistry", 450, [("Total Cholesterol","mg/dL","<200"),("HDL","mg/dL",">60"),("LDL","mg/dL","<100"),("Triglycerides","mg/dL","<150")]),
            "Typhoid":make_test("Typhoid (Widal)",      "Serology",     180, [("Widal O","","<1:80"),("Widal H","","<1:80")]),
            "Urine":  make_test("Urine Routine",        "Microbiology", 120, [("Protein","","Nil"),("Sugar","","Nil"),("Pus Cells","/HPF","0-5")]),
        }

        supplier = LabSupplier.objects.create(supplier_name="MedLab Supplies Pvt Ltd", phone="9000100001", address="Ernakulam Industrial Estate", gst_no="32ABCDE1234F1Z5")
        today = date.today()
        inv_items = [
            ("EDTA Tubes (Vacutainer)", "Consumables", 500, 5.00, 100),
            ("Plain Tubes",              "Consumables", 300, 4.50,  80),
            ("Microscope Slides",        "Consumables",1000, 1.00, 200),
            ("Glucose Reagent Kit",      "Reagents",    20, 250.00,  5),
            ("Creatinine Reagent",       "Reagents",    15, 300.00,  5),
            ("HbA1c Reagent Kit",        "Reagents",    10, 500.00,  3),
            ("Surgical Gloves (L)",      "PPE",        200,   8.00, 50),
        ]
        for name, cat, qty, cpu, reorder in inv_items:
            inv = LabInventory.objects.create(item_name=name, category=cat, qty=qty, cost_per_unit=cpu, reorder_level=reorder)
            LabBatch.objects.create(inventory_item=inv, batch_no=f"B{inv.id.hex[:6].upper()}", expiry_date=today+timedelta(days=365), qty=qty, mrp=cpu*1.1, purchase_rate=cpu, supplier=supplier)
        self.stdout.write(self.style.SUCCESS(f"  Created {len(tests)} lab tests, {len(inv_items)} inventory items."))
        return tests

    def _seed_lab_charges(self, visits, lab_tests):
        from lab.models import LabCharge
        self.stdout.write("  Seeding lab charges...")
        now = datetime.now()
        charges = [
            (0,"CBC",  "Completed",{"WBC":{"value":"7.2","unit":"K/uL","normal":"4.0-11.0"},"RBC":{"value":"4.8","unit":"M/uL","normal":"4.5-5.5"},"Hemoglobin":{"value":"14.2","unit":"g/dL","normal":"12.0-17.0"},"Platelets":{"value":"220","unit":"K/uL","normal":"150-400"}}),
            (0,"RFT",  "Completed",{"Creatinine":{"value":"1.0","unit":"mg/dL","normal":"0.7-1.2"},"Urea":{"value":"28","unit":"mg/dL","normal":"10-40"}}),
            (1,"CBC",  "Completed",{"WBC":{"value":"12.5","unit":"K/uL","normal":"4.0-11.0 (HIGH)"},"Hemoglobin":{"value":"11.8","unit":"g/dL","normal":"12.0-17.0 (LOW)"}}),
            (2,"HbA1c","Completed",{"HbA1c":{"value":"7.8","unit":"%","normal":"<5.7"}}),
            (2,"Lipid","Completed",{"Total Cholesterol":{"value":"210","unit":"mg/dL","normal":"<200"},"LDL":{"value":"135","unit":"mg/dL","normal":"<100"},"HDL":{"value":"45","unit":"mg/dL","normal":">60"}}),
            (4,"CBC",  "Pending",  None),
            (4,"Urine","Pending",  None),
            (7,"Typhoid","Completed",{"Widal O":{"value":"1:160","unit":"","normal":"<1:80"},"Widal H":{"value":"1:160","unit":"","normal":"<1:80"}}),
        ]
        count = 0
        for vi, key, status, results in charges:
            t = lab_tests[key]
            LabCharge.objects.create(visit=visits[vi], test_name=t.name, amount=t.price, status=status, results=results, report_date=now if status=="Completed" else None, technician_name="Rajan Thomas" if status=="Completed" else None, specimen="Blood")
            count += 1
        self.stdout.write(self.style.SUCCESS(f"  Created {count} lab charges."))

    def _seed_pharmacy_stock(self):
        from pharmacy.models import Supplier, PharmacyStock
        self.stdout.write("  Seeding pharmacy stock...")
        today = date.today()
        supplier = Supplier.objects.create(supplier_name="Kerala Medical Distributors", phone="9000200001", address="Broadway, Ernakulam", gst_no="32XYZAB5678G1Z1")
        stock_data = [
            ("Paracetamol 500mg","PC2501",730,12,10,6,7,500,100,"TABLET","3004",5,"Cipla Ltd",10,"PHARMACY"),
            ("Amoxicillin 500mg","AM2501",600,85,75,50,60,200,50,"TABLET","3004",12,"Sun Pharma",10,"PHARMACY"),
            ("Cetirizine 10mg","CZ2501",700,28,22,12,15,300,60,"TABLET","3004",5,"Dr. Reddy's",10,"PHARMACY"),
            ("Amlodipine 5mg","AL2501",800,45,38,20,25,400,80,"TABLET","3004",5,"Zydus Healthcare",10,"PHARMACY"),
            ("Metformin 500mg","MF2501",720,55,48,28,35,350,70,"TABLET","3004",5,"USV Pharma",10,"PHARMACY"),
            ("Glimepiride 1mg","GL2501",650,62,55,32,40,250,60,"TABLET","3004",12,"Abbott India",10,"PHARMACY"),
            ("Domperidone 10mg","DP2501",540,32,28,15,18,180,40,"TABLET","3004",5,"Lupin Ltd",10,"PHARMACY"),
            ("ORS Sachet (Electral)","OR2501",900,10,9,5,6,600,100,"POWDER","3004",0,"Franco-Indian Pharma",1,"PHARMACY"),
            ("Tetanus Toxoid Inj","TT2501",400,48,42,25,30,80,20,"INJECTION","3002",5,"Serum Institute",1,"PHARMACY"),
            ("Aspirin 75mg","AS2501",760,22,18,9,11,450,90,"TABLET","3004",5,"Bayer India",14,"PHARMACY"),
            ("Pantoprazole 40mg","PP2501",680,72,65,38,45,220,50,"TABLET","3004",12,"Alkem Labs",10,"PHARMACY"),
            ("Normal Saline 500ml","NS2501",500,45,40,22,28,60,15,"INJECTION","3002",5,"B Braun",1,"CASUALTY"),
        ]
        stocks = []
        for name,batch,days,mrp,sell,prate,ptr,qty,reorder,mtype,hsn,gst,manuf,tstrip,cat in stock_data:
            s = PharmacyStock.objects.create(name=name, batch_no=batch, expiry_date=today+timedelta(days=days), mrp=mrp, selling_price=sell, purchase_rate=prate, ptr=ptr, qty_available=qty, reorder_level=reorder, medicine_type=mtype, hsn=hsn, gst_percent=gst, manufacturer=manuf, tablets_per_strip=tstrip, category=cat, supplier=supplier)
            stocks.append(s)
        self.stdout.write(self.style.SUCCESS(f"  Created {len(stocks)} pharmacy stock items."))
        return stocks

    def _seed_pharmacy_purchases(self, users, stocks):
        from pharmacy.models import Supplier, PurchaseInvoice, PurchaseItem
        self.stdout.write("  Seeding pharmacy purchases...")
        today = date.today()
        supplier = Supplier.objects.first()
        inv = PurchaseInvoice.objects.create(supplier=supplier, supplier_invoice_no="KMD/2026/001", invoice_date=today-timedelta(days=15), credit_days=30, purchase_type="CREDIT", total_amount=0, cash_discount=200, courier_charge=50, category="PHARMACY", created_by=users.get("pharma1"))
        items = [(stocks[0],200,0,6,12,7,5),(stocks[1],80,10,50,85,60,12),(stocks[3],100,0,20,45,25,5),(stocks[4],100,0,28,55,35,5)]
        for s,qty,free,prate,mrp,ptr,gst in items:
            PurchaseItem.objects.create(purchase=inv, product_name=s.name, batch_no=s.batch_no, expiry_date=s.expiry_date, medicine_type=s.medicine_type, qty=qty, free_qty=free, purchase_rate=prate, mrp=mrp, ptr=ptr, gst_percent=gst, manufacturer=s.manufacturer, hsn=s.hsn)
        inv.calculate_distribution()
        self.stdout.write(self.style.SUCCESS("  Created 1 purchase invoice."))

    def _seed_pharmacy_sales(self, visits, stocks, patients):
        from pharmacy.models import PharmacySale, PharmacySaleItem
        self.stdout.write("  Seeding pharmacy sales...")
        sales = [
            (0, 0, [(0,20),(9,14)]),
            (1, 1, [(0,10),(2,10)]),
            (2, 2, [(4,30),(5,30)]),
            (7, 7, [(6,15),(7,5)]),
            (None, 3, [(0,10),(10,10)]),
        ]
        count = 0
        for vi, pi, items in sales:
            visit = visits[vi] if vi is not None else None
            total = sum(stocks[si].selling_price * qty for si,qty in items)
            sale = PharmacySale.objects.create(visit=visit, patient=patients[pi], total_amount=total, payment_status="PAID")
            for si,qty in items:
                s = stocks[si]
                PharmacySaleItem.objects.create(sale=sale, med_stock=s, qty=qty, unit_price=s.selling_price, amount=s.selling_price*qty, gst_percent=s.gst_percent)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"  Created {count} pharmacy sales."))

    def _seed_casualty(self, visits, stocks):
        from casualty.models import CasualtyLog, CasualtyServiceDefinition, CasualtyService, CasualtyMedicine, CasualtyObservation
        self.stdout.write("  Seeding casualty...")
        svc_defs = [
            CasualtyServiceDefinition.objects.create(name="Wound Dressing",    base_charge=150),
            CasualtyServiceDefinition.objects.create(name="Suturing",          base_charge=500),
            CasualtyServiceDefinition.objects.create(name="IV Line Insertion", base_charge=200),
            CasualtyServiceDefinition.objects.create(name="ECG",               base_charge=300),
            CasualtyServiceDefinition.objects.create(name="Nebulization",      base_charge=250),
        ]
        cv = visits[8]
        CasualtyLog.objects.create(visit=cv, transfer_path="ER -> Casualty Bay 2 -> X-Ray -> Ward", treatment_notes="Minor lacerations. No fractures. BP stable.", vitals={"bp":"130/85","pulse":"92","temp":"99.1","spo2":"97"})
        CasualtyService.objects.create(visit=cv, service_definition=svc_defs[0], qty=1, unit_charge=150, total_charge=150, notes="Wound dressed.")
        CasualtyService.objects.create(visit=cv, service_definition=svc_defs[2], qty=1, unit_charge=200, total_charge=200, notes="IV access secured.")
        ns = stocks[11]
        CasualtyMedicine.objects.create(visit=cv, med_stock=ns, qty=2, unit_price=ns.selling_price, total_price=ns.selling_price*2, dosage="IV infusion over 4 hours")
        CasualtyObservation.objects.create(visit=cv, planned_duration_minutes=120, observation_notes="Monitor BP and wound site.", is_active=False)
        self.stdout.write(self.style.SUCCESS("  Created casualty log, 5 service defs, 2 services, 1 medication."))

    def _seed_billing(self, visits):
        from billing.models import Invoice, InvoiceItem, PaymentTransaction
        self.stdout.write("  Seeding billing...")
        bills = [(0,"CASH","PAID"),(1,"UPI","PAID"),(2,"CASH","PAID"),(7,"CASH","PAID"),(8,"CASH","PAID")]
        count = 0
        for vi, mode, status in bills:
            visit = visits[vi]
            patient = visit.patient
            consult_fee = float(visit.doctor.consultation_fee) if visit.doctor else 500
            items = [("CONSULTATION", f"Consultation - Dr. {visit.doctor.get_full_name()}", 1, consult_fee, "")]
            for lc in visit.lab_charges.filter(status="Completed"):
                items.append(("LAB", lc.test_name, 1, float(lc.amount), ""))
            for sale in visit.pharmacy_sales.all():
                for si in sale.items.all():
                    items.append(("PHARMACY", si.med_stock.name, si.qty, float(si.unit_price), si.med_stock.batch_no))
            for cs in visit.casualty_services.all():
                items.append(("CASUALTY", cs.service_definition.name, cs.qty, float(cs.unit_charge), ""))
            total = sum(qty * up for _, _, qty, up, _ in items)
            inv = Invoice.objects.create(visit=visit, patient_name=patient.full_name, total_amount=total, payment_status=status, payment_mode=mode)
            for dept, desc, qty, up, batch in items:
                InvoiceItem.objects.create(invoice=inv, dept=dept, description=desc, qty=qty, unit_price=up, amount=qty*up, batch=batch or None, stock_deducted=(dept=="PHARMACY"), deducted_qty=qty if dept=="PHARMACY" else 0)
            if status == "PAID":
                PaymentTransaction.objects.create(invoice=inv, amount=total, mode=mode, remarks="Counter payment", transaction_id=f"TXN{inv.id.hex[:8].upper()}")
            count += 1
        self.stdout.write(self.style.SUCCESS(f"  Created {count} invoices with payment records."))
