from billing.serializers import InvoiceSerializer
from patients.models import Visit
from django.db import transaction

data = {
    'visit': Visit.objects.last().id,
    'patient_name': 'Test',
    'total_amount': 100,
    'payment_status': 'PAID',
    'items': [
        {
            'dept': 'PHARMACY',
            'description': 'ALKOF-DX',
            'qty': 1,
            'unit_price': 100,
            'amount': 100,
            'batch': '26860202'
        }
    ]
}

serializer = InvoiceSerializer(data=data)
print('is_valid:', serializer.is_valid())

try:
    with transaction.atomic():
        inv = serializer.save()
        print('inv items:', [(i.description, i.deducted_qty, i.stock_deducted) for i in inv.items.all()])
except Exception as e:
    print('error:', e)
