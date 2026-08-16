from django.test import TestCase, Client
from django.contrib.auth.models import User
from apps.devices.models import Device, DeviceOS
from apps.audit.models import AuditLog, AuditOperation, AuditStatus
from apps.audit.services import log_audit_event


class AuditTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_user(username='admin', password='password', is_superuser=True)
        self.client.force_login(self.admin)

        self.device = Device.objects.create(
            personnel_number='550047',
            hostname='ZK34990NX0814',
            operating_system=DeviceOS.WINDOWS,
            ip_address='10.20.15.42',
            username='550047'
        )

    def test_log_creation_and_api_query(self):
        """Tests logging audit events and querying through REST API."""
        log = log_audit_event(
            user=self.admin,
            operation=AuditOperation.DOWNLOAD,
            device=self.device,
            path='C:\\Users\\550047\\Desktop\\report.pdf',
            status=AuditStatus.SUCCESS,
            ip_address='127.0.0.1'
        )
        self.assertIsNotNone(log)
        self.assertEqual(log.operation, AuditOperation.DOWNLOAD)

        # Query via API
        response = self.client.get('/api/audit/', {'operation': 'DOWNLOAD'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        results = data.get('results', data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['operation'], 'DOWNLOAD')
