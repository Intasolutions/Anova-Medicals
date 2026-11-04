from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from billing.models import Invoice
from patients.models import Patient, Visit


class BillingQueueTests(APITestCase):
    """The "Action Required" queue on the Billing screen is built from these two endpoints."""

    INVOICES_URL = '/api/billing/invoices/?unpaid=true&page_size=10000'
    VISITS_URL = '/api/reception/visits/?billing_queue=true&page_size=10000'

    def setUp(self):
        user = get_user_model().objects.create_user(
            username='frontdesk', password='x', role='RECEPTION'
        )
        self.client.force_authenticate(user)

    def _patient(self):
        # A patient can only have one open visit, so each visit gets its own.
        return Patient.objects.create(
            full_name='Test Patient', age=30, gender='M', phone='9000000000', address='Somewhere'
        )

    def _invoice(self, status, visit=None):
        return Invoice.objects.create(
            visit=visit,
            patient_name='Test Patient',
            total_amount=Decimal('100.00'),
            payment_status=status,
        )

    def _parked_visit(self):
        return Visit.objects.create(patient=self._patient(), assigned_role='BILLING', status='OPEN')

    def _ids(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        return {row['id'] for row in response.data['results']}

    def test_unpaid_returns_every_open_invoice_past_the_default_page_size(self):
        open_ids = {self._invoice('DRAFT').id for _ in range(25)}
        self.assertEqual(self._ids(self.INVOICES_URL), open_ids)

    def test_unpaid_includes_open_statuses_only(self):
        expected = {self._invoice(s).id for s in ('DRAFT', 'PENDING', 'PARTIAL')}
        self._invoice('PAID')
        self._invoice('CANCELLED')
        self.assertEqual(self._ids(self.INVOICES_URL), expected)

    def test_parked_visit_with_open_invoice_is_left_to_the_invoice_list(self):
        for status in ('DRAFT', 'PENDING', 'PARTIAL'):
            self._invoice(status, visit=self._parked_visit())
        self.assertEqual(self._ids(self.VISITS_URL), set())

    def test_parked_visit_without_an_open_invoice_stays_in_the_queue(self):
        no_invoice = self._parked_visit()
        prepaid = self._parked_visit()
        self._invoice('PAID', visit=prepaid)
        cancelled = self._parked_visit()
        self._invoice('CANCELLED', visit=cancelled)
        # Settling an invoice closes its visit; these patients were then sent
        # back to the billing desk.
        Visit.objects.filter(id__in=[prepaid.id, cancelled.id]).update(status='OPEN')
        self.assertEqual(self._ids(self.VISITS_URL), {no_invoice.id, prepaid.id, cancelled.id})

    def test_parked_visit_past_the_default_page_size_is_returned(self):
        expected = {self._parked_visit().id for _ in range(15)}
        self.assertEqual(self._ids(self.VISITS_URL), expected)

    def test_visit_not_at_billing_is_excluded(self):
        Visit.objects.create(patient=self._patient(), assigned_role='DOCTOR', status='OPEN')
        Visit.objects.create(patient=self._patient(), assigned_role='BILLING', status='CLOSED')
        self.assertEqual(self._ids(self.VISITS_URL), set())

    def test_unpaid_query_count_does_not_grow_with_invoices(self):
        visit = self._parked_visit()
        self._invoice('DRAFT', visit=visit)
        with self.assertNumQueries(4):  # count, invoices + joins, items, payments
            self.client.get(self.INVOICES_URL)
        for _ in range(5):
            self._invoice('DRAFT', visit=self._parked_visit())
        with self.assertNumQueries(4):
            self.client.get(self.INVOICES_URL)
