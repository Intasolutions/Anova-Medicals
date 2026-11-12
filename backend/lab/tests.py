from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from lab.models import LabCategory, LabCharge, LabTest, LabTestParameter
from patients.models import Patient, Visit


class LabOrderTests(APITestCase):
    CATEGORY_REORDER = '/api/lab/categories/reorder/'
    TEST_REORDER = '/api/lab/tests/reorder/'

    def setUp(self):
        self.login('LAB')
        self.haem = LabCategory.objects.create(name='HAEMATOLOGY', display_order=1)
        self.bio = LabCategory.objects.create(name='BIOCHEMISTRY', display_order=2)
        self.cbc = self._test('CBC', 'HAEMATOLOGY', 1)
        self.esr = self._test('ESR', 'HAEMATOLOGY', 2)
        self.lipid = self._test('LIPID PROFILE', 'BIOCHEMISTRY', 1)

    def login(self, role):
        user, _ = get_user_model().objects.get_or_create(username=role.lower(), defaults={'role': role})
        self.client.force_authenticate(user)

    def _test(self, name, category, order):
        return LabTest.objects.create(name=name, category=category, price=100, display_order=order)

    def test_reorder_categories_changes_list_order(self):
        response = self.client.post(self.CATEGORY_REORDER, {'ids': [self.bio.id, self.haem.id]}, format='json')
        self.assertEqual(response.status_code, 200)
        listed = self.client.get('/api/lab/categories/').data
        self.assertEqual([c['name'] for c in listed], ['BIOCHEMISTRY', 'HAEMATOLOGY'])

    def test_reorder_tests_only_affects_that_category(self):
        response = self.client.post(
            self.TEST_REORDER, {'category': 'HAEMATOLOGY', 'ids': [self.esr.id, self.cbc.id]}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([t['name'] for t in response.data], ['ESR', 'CBC'])
        self.lipid.refresh_from_db()
        self.assertEqual(self.lipid.display_order, 1)

    def test_partial_or_foreign_lists_are_refused_and_change_nothing(self):
        cases = [
            [self.esr.id],                                # a test is missing
            [self.esr.id, self.cbc.id, self.lipid.id],    # a test from another category
            [self.esr.id, self.esr.id],                   # a duplicate
            [self.esr.id, 'x'],                           # not an id
        ]
        for ids in cases:
            response = self.client.post(self.TEST_REORDER, {'category': 'HAEMATOLOGY', 'ids': ids}, format='json')
            self.assertEqual(response.status_code, 400, ids)
        self.esr.refresh_from_db()
        self.cbc.refresh_from_db()
        self.assertEqual((self.cbc.display_order, self.esr.display_order), (1, 2))

    def test_only_lab_and_admin_can_reorder(self):
        for role in ('RECEPTION', 'DOCTOR', 'PHARMACY'):
            self.login(role)
            response = self.client.post(self.CATEGORY_REORDER, {'ids': [self.bio.id, self.haem.id]}, format='json')
            self.assertEqual(response.status_code, 403, role)
            response = self.client.post(
                self.TEST_REORDER, {'category': 'HAEMATOLOGY', 'ids': [self.esr.id, self.cbc.id]}, format='json'
            )
            self.assertEqual(response.status_code, 403, role)
        self.login('ADMIN')
        response = self.client.post(self.CATEGORY_REORDER, {'ids': [self.bio.id, self.haem.id]}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_new_entries_go_to_the_end(self):
        category = self.client.post('/api/lab/categories/', {'name': 'SEROLOGY'}, format='json')
        self.assertEqual(category.data['display_order'], 3)
        test = self.client.post(
            '/api/lab/tests/', {'name': 'NEW', 'category': 'HAEMATOLOGY', 'price': '50.00'}, format='json'
        )
        self.assertEqual(test.status_code, 201)
        self.assertEqual(test.data['display_order'], 3)

    def test_moving_a_test_to_another_category_puts_it_last_there(self):
        response = self.client.patch(f'/api/lab/tests/{self.cbc.id}/', {'category': 'BIOCHEMISTRY'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['display_order'], 2)

    def test_normal_edit_cannot_change_the_order(self):
        response = self.client.patch(
            f'/api/lab/tests/{self.esr.id}/', {'price': '75.00', 'display_order': 99}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.esr.refresh_from_db()
        self.assertEqual(self.esr.display_order, 2)

    def test_charges_report_their_package_name(self):
        patient = Patient.objects.create(full_name='P', age=30, gender='M', phone='9000000000', address='A')
        visit = Visit.objects.create(patient=patient, assigned_role='LAB', status='OPEN')
        package = LabCharge.objects.create(visit=visit, test_name='HEALTH CARD PACKAGE', amount=500)
        sub_test = LabCharge.objects.create(visit=visit, test_name='CBC', amount=0, parent_charge=package)

        response = self.client.get(f'/api/lab/charges/?visit={visit.id}&page_size=10000')
        self.assertEqual(response.status_code, 200)
        names = {row['lc_id']: row['parent_test_name'] for row in response.data['results']}
        self.assertEqual(names[sub_test.id], 'HEALTH CARD PACKAGE')
        self.assertIsNone(names[package.id])

    def test_editing_gender_is_saved(self):
        response = self.client.patch(f'/api/lab/tests/{self.esr.id}/', {'gender': 'F'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.esr.refresh_from_db()
        self.assertEqual(self.esr.gender, 'F')


class ParameterOrderTests(APITestCase):
    def setUp(self):
        user, _ = get_user_model().objects.get_or_create(username='lab', defaults={'role': 'LAB'})
        self.client.force_authenticate(user)
        self.test = LabTest.objects.create(name='CBC', category='HAEMATOLOGY', price=100)

    def save(self, names):
        rows = [{'name': name, 'is_heading': name.isupper()} for name in names]
        return self.client.patch(f'/api/lab/tests/{self.test.id}/', {'parameters': rows}, format='json')

    def listed(self):
        return [p['name'] for p in self.client.get(f'/api/lab/tests/{self.test.id}/').data['parameters']]

    def test_parameters_come_back_in_the_saved_order(self):
        self.save(['Haemoglobin', 'DIFFERENTIAL COUNT', 'Neutrophils', 'Lymphocytes'])
        self.save(['DIFFERENTIAL COUNT', 'Lymphocytes', 'Neutrophils', 'Haemoglobin'])
        self.assertEqual(self.listed(), ['DIFFERENTIAL COUNT', 'Lymphocytes', 'Neutrophils', 'Haemoglobin'])
        self.assertEqual(
            list(LabTestParameter.objects.filter(test=self.test).values_list('display_order', flat=True)),
            [1, 2, 3, 4],
        )

    def test_order_is_kept_when_creating_a_test(self):
        response = self.client.post('/api/lab/tests/', {
            'name': 'LFT', 'category': 'BIOCHEMISTRY', 'price': 100,
            'parameters': [{'name': 'Zinc'}, {'name': 'Albumin'}, {'name': 'Bilirubin'}],
        }, format='json')
        self.assertEqual([p['name'] for p in response.data['parameters']], ['Zinc', 'Albumin', 'Bilirubin'])

    def test_a_failed_save_keeps_the_old_parameters(self):
        self.save(['Haemoglobin', 'Platelets'])
        with patch('lab.serializers.LabTestParameter.objects.bulk_create', side_effect=RuntimeError('db down')):
            with self.assertRaises(RuntimeError):
                self.save(['Platelets', 'Haemoglobin'])
        self.assertEqual(self.listed(), ['Haemoglobin', 'Platelets'])
