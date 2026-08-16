from django.test import TestCase, Client
from django.contrib.auth.models import User
from unittest.mock import patch
from apps.devices.models import Device, DeviceOS, DeviceStatus, ConnectorType, DeviceCredential
from apps.connectors.base import ConnectionResult


class DeviceTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_user(username='admin', password='password', is_superuser=True)
        self.client.force_login(self.admin)

        self.device = Device.objects.create(
            personnel_number='550047',
            hostname='ZK34990NX0814',
            operating_system=DeviceOS.WINDOWS,
            ip_address='10.20.15.42',
            username='550047',
            connector_type=ConnectorType.WINDOWS_REMOTE
        )

    def test_device_creation_and_credential_encryption(self):
        """Tests device creation and Fernet credential encryption."""
        self.assertEqual(str(self.device.hostname), 'ZK34990NX0814')
        self.assertTrue(self.device.is_windows)

        cred = DeviceCredential.objects.create(device=self.device)
        raw_secret = 'super_secret_bank_token_99'
        cred.set_secret(raw_secret)
        cred.save()

        # Decrypt check
        self.assertEqual(cred.get_secret(), raw_secret)
        # Raw encrypted field should not equal raw string
        self.assertNotEqual(cred._encrypted_secret, raw_secret)

    def test_device_api_list(self):
        """Tests GET /api/devices/ endpoint."""
        response = self.client.get('/api/devices/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        results = data.get('results', data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['hostname'], 'ZK34990NX0814')

    @patch('apps.connectors.windows.WindowsConnector.test_connection')
    def test_device_connect_api(self, mock_conn):
        """Tests POST /api/devices/{id}/connect/ endpoint."""
        mock_conn.return_value = ConnectionResult(success=True, status='ONLINE', latency_ms=12.5, message='Bağlandı')
        response = self.client.post(f'/api/devices/{self.device.id}/connect/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['status'], 'ONLINE')

        # Check that DB was updated
        self.device.refresh_from_db()
        self.assertEqual(self.device.status, DeviceStatus.ONLINE)
        self.assertIsNotNone(self.device.last_seen)
