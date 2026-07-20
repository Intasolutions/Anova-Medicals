import requests
import json

base_url = "http://127.0.0.1:8000/api"

print("--- ALL INVOICES ---")
res = requests.get(f"{base_url}/billing/invoices/")
data = res.json()
print("Count:", data['count'] if 'count' in data else len(data))
if 'results' in data:
    for inv in data['results']:
        print(f"ID: {inv['id']}, Patient Name: {inv.get('patient_name')}")

print("\n--- PATIENT 1 INVOICES ---")
res = requests.get(f"{base_url}/billing/invoices/?visit__patient=1")
data = res.json()
print("Count:", data['count'] if 'count' in data else len(data))
if 'results' in data:
    for inv in data['results']:
        print(f"ID: {inv['id']}, Patient Name: {inv.get('patient_name')}")
