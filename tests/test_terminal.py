from django.test import TestCase, Client
from django.contrib.auth.models import User
from unittest.mock import patch
from apps.devices.models import Device, DeviceOS, ConnectorType


class TerminalAPITestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='admin', password='password', is_superuser=True)
        self.client.force_login(self.user)

        self.device = Device.objects.create(
            personnel_number='550047',
            hostname='ZK34990NX0814',
            operating_system=DeviceOS.WINDOWS,
            ip_address='10.20.15.42',
            username='550047',
            connector_type=ConnectorType.WINDOWS_REMOTE
        )

    @patch('apps.connectors.windows.WindowsConnector.execute_command')
    def test_terminal_command_execution(self, mock_exec):
        """Tests POST /api/devices/{id}/execute/ with ping and whoami."""
        mock_exec.side_effect = [
            {
                'output': 'Reply from 10.20.15.42: bytes=32 time=1ms TTL=128',
                'stdout': 'Reply from 10.20.15.42: bytes=32 time=1ms TTL=128',
                'stderr': '',
                'exit_code': 0,
                'success': True
            },
            {
                'output': 'INTERNAL\\550047',
                'stdout': 'INTERNAL\\550047',
                'stderr': '',
                'exit_code': 0,
                'success': True
            }
        ]

        # Test Ping
        response = self.client.post(
            f'/api/devices/{self.device.id}/execute/',
            {'command': 'ping 10.20.15.42'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get('success', False))
        self.assertIn('Reply from', data['output'])

        # Test Whoami
        response_whoami = self.client.post(
            f'/api/devices/{self.device.id}/execute/',
            {'command': 'whoami'},
            content_type='application/json'
        )
        self.assertEqual(response_whoami.status_code, 200)
        self.assertIn('INTERNAL\\550047', response_whoami.json()['output'])

    def test_terminal_page_view(self):
        """Tests GET /terminal/."""
        response = self.client.get('/terminal/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Canlı Terminal')
