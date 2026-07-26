import os
import django
import threading
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revive_cms.settings')
django.setup()

from pharmacy.models import PharmacySale, PharmacyStock
from patients.models import Visit

print("Initializing Stress Test...")

def stress_test_dispense():
    # Pick the first OPEN pharmacy visit
    visit = Visit.objects.filter(assigned_role='PHARMACY', status='OPEN').first()
    if not visit:
        print("No open pharmacy visits found.")
        return

    # Pick a dummy medicine
    stock = PharmacyStock.objects.first()
    if not stock:
        print("No pharmacy stock found.")
        return
        
    initial_stock = stock.qty_available
    print(f"Target Visit: {visit.id}, Target Stock ID: {stock.id}, Initial Qty: {initial_stock}")

    # Use Django Rest Framework test client directly for speed
    from rest_framework.test import APIClient
    
    payload = {
        "visit": visit.id,
        "patient": visit.patient.id,
        "items": [
            {
                "med_stock": stock.id,
                "qty": 1,
                "unit_price": 10.0,
                "gst_percent": 0.0,
                "dosage": "1-0-1",
                "timing": "After Food"
            }
        ],
        "payment_status": "PENDING"
    }

    success_count = 0
    fail_count = 0

    from django.contrib.auth import get_user_model
    User = get_user_model()
    test_user, _ = User.objects.get_or_create(username='stress_doctor', defaults={'is_staff': True})

    def attempt_sale():
        nonlocal success_count, fail_count
        client = APIClient(SERVER_NAME='localhost')
        client.force_authenticate(user=test_user)
        # Direct API Call to serializers view
        res = client.post('/api/pharmacy/sales/', payload, format='json')
        if res.status_code == 201:
            success_count += 1
        else:
            fail_count += 1

    threads = []
    # Bombard with 20 simultaneous threads!
    print("Spawning 20 simultaneous threads clicking 'Finalize Sale'...")
    for _ in range(20):
        t = threading.Thread(target=attempt_sale)
        threads.append(t)
        
    start_time = time.time()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
        
    print(f"Time taken: {time.time() - start_time:.2f}s")
    print(f"Successful Sales created: {success_count} (Ideally, frontend blocks this, but backend should sync inventory)")
    print(f"Failed/Rejected Sales: {fail_count}")

    stock.refresh_from_db()
    print(f"Final Qty: {stock.qty_available}")
    print(f"Total deducted: {initial_stock - stock.qty_available}")
    
    if (initial_stock - stock.qty_available) == success_count:
        print("RESULT: PASS! Inventory perfectly aligns with successful sales.")
    else:
        print("RESULT: FAIL! Concurrency race condition detected in inventory.")

if __name__ == "__main__":
    stress_test_dispense()
