import os, sys, django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revive_cms.settings')
django.setup()

from lab.models import LabCategory, LabTest, LabTestParameter

data = [
    {
        "category": "Biochemistry",
        "tests": [
            {
                "name": "Random Blood Sugar",
                "price": 100,
                "parameters": [
                    {"name": "Random Blood Sugar", "unit": "mg/dl", "normal_range": "70 - 140 mg/dl"}
                ]
            },
            {
                "name": "Lipid Profile Test (LPT)",
                "price": 800,
                "parameters": [
                    {"name": "Total Cholestrol", "unit": "mg/dl", "normal_range": "DESIRABLE : <= 200 mg/dL\nBORDERLINE HIGH RISK : 200 - 240 mg/dL\nHIGH RISK : > 240 mg/dL"},
                    {"name": "Serum Triglycerides", "unit": "mg/dl", "normal_range": "60 - 165 mg/dl\nDesirable : < 200 mg/dL\nBorderline high risk : 200 - 400 mg/dL\nElevated : > 400 mg/dL"},
                    {"name": "HDL Cholesterol - Direct", "unit": "mg/dl", "normal_range": "35 - 80 mg/dl"},
                    {"name": "LDL Cholesterol - Direct", "unit": "mg/dl", "normal_range": "up to 100 mg/dl"},
                    {"name": "VLDL Cholesterol", "unit": "mg/dl", "normal_range": "0 - 60 mg/dl"},
                    {"name": "LDL/HDL", "unit": "", "normal_range": ""}
                ]
            },
            {
                "name": "Liver Function Test (LFT)",
                "price": 1200,
                "parameters": [
                    {"name": "Total Bilirubin", "unit": "mg/dl", "normal_range": "0 - 1.2 mg/dl"},
                    {"name": "Direct Bilirubin", "unit": "mg/dl", "normal_range": "0 - 0.4 mg/dl"},
                    {"name": "Indirect Bilirubin", "unit": "mg/dl", "normal_range": "0 - 0.75 mg/dl"},
                    {"name": "Total Protein", "unit": "g/dl", "normal_range": "6 - 8.5 g/dl"},
                    {"name": "Serum Albumin", "unit": "g/dl", "normal_range": "3.5 - 5.2 g/dl"},
                    {"name": "Serum Globulin", "unit": "g/dL", "normal_range": "2.3 - 3.5 g/dL"},
                    {"name": "A/G Ratio", "unit": "", "normal_range": "1 - 1.5"},
                    {"name": "Aspartate Aminotransferase (SGOT/AST)", "unit": "U/L", "normal_range": "up to 46 U/L"},
                    {"name": "Alanine Aminotransferase (SGPT/ALT)", "unit": "U/L", "normal_range": "up to 49 U/L"},
                    {"name": "Alkaline Phosphatase", "unit": "IU/L", "normal_range": "64 - 306 IU/L"}
                ]
            },
            {
                "name": "Renal Function Test (RFT)",
                "price": 1000,
                "parameters": [
                    {"name": "Blood Urea", "unit": "mg/dL", "normal_range": "11 - 50 mg/dL"},
                    {"name": "Serum Creatinine", "unit": "mg/dL", "normal_range": "0.6 - 1.3 mg/dL"},
                    {"name": "Serum Uric Acid", "unit": "mg/dL", "normal_range": "-2.6 - 6 mg/dL"}
                ]
            }
        ]
    },
    {
        "category": "Clinical Pathology",
        "tests": [
            {
                "name": "Urine Routine",
                "price": 250,
                "parameters": [
                    {"name": "Colour", "unit": "", "normal_range": ""},
                    {"name": "Appearance", "unit": "", "normal_range": ""},
                    {"name": "Albumin", "unit": "", "normal_range": ""},
                    {"name": "Sugar", "unit": "", "normal_range": ""},
                    {"name": "Pus", "unit": "", "normal_range": ""},
                    {"name": "RBC", "unit": "", "normal_range": ""},
                    {"name": "Epithelial Cells", "unit": "", "normal_range": ""},
                    {"name": "Cast", "unit": "", "normal_range": ""},
                    {"name": "Crystals", "unit": "", "normal_range": ""}
                ]
            }
        ]
    },
    {
        "category": "Haematology",
        "tests": [
            {
                "name": "Complete Blood Count (CBC)",
                "price": 500,
                "parameters": [
                    {"name": "Haemoglobin", "unit": "gm/dl", "normal_range": "12 - 16 gm/dl"},
                    {"name": "Total Count", "unit": "cells/cumm", "normal_range": "4000 - 11000 cells/cumm"},
                    {"name": "Neutrophils (Differential)", "unit": "%", "normal_range": "40 - 70 %"},
                    {"name": "Lymphocytes (Differential)", "unit": "%", "normal_range": "20 - 45 %"},
                    {"name": "Eosinophils (Differential)", "unit": "%", "normal_range": "2 - 8 %"},
                    {"name": "Monocytes (Differential)", "unit": "%", "normal_range": "1 - 6 %"},
                    {"name": "R.B.C Count", "unit": "mill/cumm", "normal_range": "4 - 5.5 mill/cumm"},
                    {"name": "Packed Cell Volume (PCV)", "unit": "%", "normal_range": "37 - 47 %"},
                    {"name": "M.C.V", "unit": "fl", "normal_range": "80 - 98 fl"},
                    {"name": "M.C.H", "unit": "pg", "normal_range": "26 - 34 pg"},
                    {"name": "M.C.H.C", "unit": "%", "normal_range": "31 - 38 %"},
                    {"name": "Platelet Count", "unit": "Lakhs/cumm", "normal_range": "1.5 - 4.5 Lakhs/cumm"},
                    {"name": "ESR", "unit": "mm/hr", "normal_range": "0 - 20 mm/hr"}
                ]
            }
        ]
    }
]

def run():
    print("Seeding lab data extracted from PDF...")
    for cat_data in data:
        cat_name = cat_data["category"]
        category, created = LabCategory.objects.get_or_create(name=cat_name)
        if created:
            print(f"Created category: {cat_name}")
            
        for test_data in cat_data["tests"]:
            # Some tests might already be seeded like CBC, Lipid Profile, FBS. Let's get or create them based on name.
            test, t_created = LabTest.objects.get_or_create(
                name=test_data["name"],
                defaults={
                    "category": category.name,
                    "price": test_data["price"]
                }
            )
            if t_created:
                print(f"  Created test: {test.name}")
            else:
                print(f"  Found existing test: {test.name}")
                
            # Clear old parameters if adding from PDF to ensure they are correct
            test.parameters.all().delete()
            
            for param_data in test_data["parameters"]:
                LabTestParameter.objects.create(
                    test=test,
                    name=param_data["name"],
                    unit=param_data["unit"],
                    normal_range=param_data["normal_range"]
                )
            print(f"    Added {len(test_data['parameters'])} parameters for {test.name}")
            
    print("Done!")

if __name__ == '__main__':
    run()
