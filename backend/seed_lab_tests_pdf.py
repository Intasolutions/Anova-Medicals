import os
import sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
sys.path.insert(0, BACKEND_DIR)
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revive_cms.settings')
django.setup()

from lab.models import LabCategory, LabTest, LabTestParameter

def seed():
    print("Clearing existing Lab Categories, Tests, and Parameters...")
    LabTestParameter.objects.all().delete()
    LabTest.objects.all().delete()
    LabCategory.objects.all().delete()
    print("Cleared.")

    categories = {
        "BIOCHEMISTRY": LabCategory.objects.create(name="BIOCHEMISTRY", description="Biochemistry Tests"),
        "CLINICAL PATHOLOGY": LabCategory.objects.create(name="CLINICAL PATHOLOGY", description="Clinical Pathology Tests"),
        "HAEMATOLOGY": LabCategory.objects.create(name="HAEMATOLOGY", description="Haematology Tests"),
        "RENAL": LabCategory.objects.create(name="RENAL", description="Renal Function Tests"), # For RFT
        "GENERAL": LabCategory.objects.create(name="GENERAL", description="General Tests"), # For BP
    }

    tests_data = [
        {
            "name": "RANDOM BLOOD SUGAR",
            "category": "BIOCHEMISTRY",
            "price": 100.00,
            "parameters": [
                {"name": "RANDOM BLOOD SUGAR", "unit": "mg/dl", "normal_range": "70 - 140 mg/dl"},
            ]
        },
        {
            "name": "LIVER FUNCTION TEST (LFT)",
            "category": "BIOCHEMISTRY",
            "price": 800.00,
            "parameters": [
                {"name": "TOTAL BILIRUBIN", "unit": "mg/dl", "normal_range": "0 - 1.2 mg/dl"},
                {"name": "DIRECT BILIRUBIN", "unit": "mg/dl", "normal_range": "0 - 0.4 mg/dl"},
                {"name": "INDIRECT BILIRUBIN", "unit": "mg/dl", "normal_range": "0 - 0.75 mg/dl"},
                {"name": "TOTAL PROTEIN", "unit": "g/dl", "normal_range": "6 - 8.5 g/dl"},
                {"name": "SERUM ALBUMIN", "unit": "g/dl", "normal_range": "3.5 - 5.2 g/dl"},
                {"name": "SERUM GLOBULIN", "unit": "g/dL", "normal_range": "2.3 - 3.5 g/dL"},
                {"name": "A/G RATIO", "unit": "", "normal_range": "1 - 1.5"},
                {"name": "ASPARATE AMINOTRANSFERASE (SGOT/AST)", "unit": "U/L", "normal_range": "up to 46 U/L"},
                {"name": "ALANINE AMINOTRANSFERASE (SGPT/ALT)", "unit": "U/L", "normal_range": "up to 49 U/L"},
                {"name": "ALKALINE PHOSPHATASE", "unit": "IU/L", "normal_range": "64 - 306 IU/L"},
            ]
        },
        {
            "name": "RENAL FUNCTION TEST (RFT)",
            "category": "RENAL",
            "price": 700.00,
            "parameters": [
                {"name": "BLOOD UREA", "unit": "mg/dL", "normal_range": "11 - 50 mg/dL"},
                {"name": "SERUM CREATININE", "unit": "mg/dL", "normal_range": "0.6 - 1.3 mg/dL"},
                {"name": "SERUM URIC ACID", "unit": "mg/dL", "normal_range": "-2.6 - 6 mg/dL"},
            ]
        },
        {
            "name": "BLOOD PRESSURE (BP)",
            "category": "GENERAL",
            "price": 50.00,
            "parameters": [
                {"name": "BLOOD PRESSURE (BP)", "unit": "mmhg", "normal_range": "120 - 80 mmhg"},
            ]
        },
        {
            "name": "URINE ROUTINE",
            "category": "CLINICAL PATHOLOGY",
            "price": 200.00,
            "parameters": [
                {"name": "COLOUR", "unit": "", "normal_range": ""},
                {"name": "APPEARANCE", "unit": "", "normal_range": ""},
                {"name": "ALBUMIN", "unit": "", "normal_range": ""},
                {"name": "SUGAR", "unit": "", "normal_range": ""},
                {"name": "PUS", "unit": "", "normal_range": ""},
                {"name": "RBC", "unit": "", "normal_range": ""},
                {"name": "EPITHELIAL CELLS", "unit": "", "normal_range": ""},
                {"name": "CAST", "unit": "", "normal_range": ""},
                {"name": "CRYSTALS", "unit": "", "normal_range": ""},
            ]
        }
    ]

    lipid_profile_params = [
        {"name": "TOTAL CHOLESTROL", "unit": "mg/dl", "normal_range": "DESIRABLE : <= 200 mg/dL\nBORDERLINE HIGH RISK : 200 - 240 mg/dL\nHIGH RISK : > 240 mg/dL"},
        {"name": "SERUM TRIGLYCERIDES", "unit": "mg/dl", "normal_range": "60 - 165 mg/dl\nSpecial condition:\nDirisable : < 200 mg/dL\nBorderline hihg risk : 200 - 400 mg/dL\nElevated : > 400 mg/dL"},
        {"name": "HDL CHOLESTEROL - DIRECT", "unit": "mg/dl", "normal_range": "35 - 80 mg/dl"},
        {"name": "LDL CHOLESTEROL – DIRECT", "unit": "mg/dl", "normal_range": "up to 100 mg/dl"},
        {"name": "VLDL CHOLESTEROL", "unit": "mg/dl", "normal_range": "0 - 60 mg/dl"},
        {"name": "LDL/HDL", "unit": "", "normal_range": ""},
    ]

    tests_data.append({
        "name": "LIPID PROFILE TEST (LPT) - FASTING",
        "category": "BIOCHEMISTRY",
        "price": 600.00,
        "parameters": lipid_profile_params
    })
    
    tests_data.append({
        "name": "LIPID PROFILE TEST (LPT) - NON-FASTING",
        "category": "BIOCHEMISTRY",
        "price": 600.00,
        "parameters": lipid_profile_params
    })

    cbc_params = [
        {"name": "HAEMOGLOBIN", "unit": "gm/dl", "normal_range": "12 - 16 gm/dl"},
        {"name": "TOTAL COUNT", "unit": "cells/cumm", "normal_range": "4000 - 11000 cells/cumm"},
        {"name": "DIFFERENTIAL COUNT", "unit": "", "normal_range": "", "is_heading": True},
        {"name": "NEUTROPHILS", "unit": "%", "normal_range": "40 - 70 %"},
        {"name": "LYMPHOCYTES", "unit": "%", "normal_range": "20 - 45 %"},
        {"name": "EOSINOPHILS", "unit": "%", "normal_range": "2 - 8 %"},
        {"name": "MONOCYTES", "unit": "%", "normal_range": "1 - 6 %"},
        {"name": "R.B.C COUNT", "unit": "mill/cumm", "normal_range": "4 - 5.5 mill/cumm"},
        {"name": "PACKED CELL VOLUME (PCV)", "unit": "%", "normal_range": "37 - 47 %"},
        {"name": "M.C.V", "unit": "fl", "normal_range": "80 - 98 fl"},
        {"name": "M.C.H", "unit": "pg", "normal_range": "26 - 34 pg"},
        {"name": "M.C.H.C", "unit": "%", "normal_range": "31 - 38 %"},
        {"name": "PLATELET COUNT", "unit": "Lakhs/cumm", "normal_range": "1.5 - 4.5 Lakhs/cumm"},
        {"name": "ESR", "unit": "mm/hr", "normal_range": "0 - 20 mm/hr"},
    ]

    tests_data.append({
        "name": "COMPLETE BLOOD COUNT(CBC) - FASTING",
        "category": "HAEMATOLOGY",
        "price": 400.00,
        "parameters": cbc_params
    })
    
    tests_data.append({
        "name": "COMPLETE BLOOD COUNT(CBC) - NON-FASTING",
        "category": "HAEMATOLOGY",
        "price": 400.00,
        "parameters": cbc_params
    })

    print("Seeding Lab Tests...")
    for tdata in tests_data:
        test = LabTest.objects.create(
            name=tdata["name"],
            category=tdata["category"],
            price=tdata["price"]
        )
        for param in tdata["parameters"]:
            LabTestParameter.objects.create(
                test=test,
                name=param["name"],
                unit=param.get("unit", ""),
                normal_range=param.get("normal_range", ""),
                is_heading=param.get("is_heading", False)
            )
        print(f"Created: {test.name}")

    print("Seed complete.")

if __name__ == '__main__':
    seed()
