import io
from unittest import mock

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


class LoginLoggingTests(APITestCase):
    """Login requests must never write a password or refresh token to the server log."""

    PASSWORD = 'S3cret-Pass!'

    def setUp(self):
        get_user_model().objects.create_user(username='nurse1', password=self.PASSWORD, role='RECEPTION')

    def _post(self, url, body):
        printed = io.StringIO()
        with mock.patch('sys.stdout', printed), mock.patch('sys.stderr', printed):
            response = self.client.post(url, body, format='json')
        return response, printed.getvalue()

    def test_login_works_and_password_is_not_printed(self):
        response, printed = self._post('/api/auth/token/', {'username': 'nurse1', 'password': self.PASSWORD})
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertNotIn(self.PASSWORD, printed)

    def test_failed_login_password_is_not_printed(self):
        response, printed = self._post('/api/auth/token/', {'username': 'nurse1', 'password': 'Wrong-Pass-123'})
        self.assertEqual(response.status_code, 401)
        self.assertNotIn('Wrong-Pass-123', printed)

    def test_refresh_token_is_not_printed(self):
        login, _ = self._post('/api/auth/token/', {'username': 'nurse1', 'password': self.PASSWORD})
        refresh = login.data['refresh']
        response, printed = self._post('/api/auth/token/refresh/', {'refresh': refresh})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(refresh, printed)
