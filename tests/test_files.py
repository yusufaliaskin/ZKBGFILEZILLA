import io
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch
from apps.devices.models import Device, DeviceOS, ConnectorType
from apps.connectors.base import FileEntry
from datetime import datetime


class FileAPITestCase(TestCase):
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

    @patch('apps.connectors.windows.WindowsConnector.list_directory')
    def test_list_files_api(self, mock_list):
        """Tests GET /api/devices/{id}/files/."""
        mock_list.return_value = [
            FileEntry(
                name='test.txt',
                path='C:\\test.txt',
                is_dir=False,
                size=1024,
                modified_time=datetime.now(),
                permissions='rw-r--r--',
                owner='admin'
            )
        ]
        response = self.client.get(f'/api/devices/{self.device.id}/files/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('entries', data)
        self.assertIn('breadcrumbs', data)
        self.assertTrue(len(data['entries']) > 0)

    @patch('apps.connectors.windows.WindowsConnector.upload_file')
    @patch('apps.connectors.windows.WindowsConnector.download_file')
    def test_file_upload_and_download_api(self, mock_dl, mock_up):
        """Tests file upload and subsequent download."""
        mock_up.return_value = True
        mock_dl.return_value = io.BytesIO(b"Hello Secure Ops")
        
        upload_file = SimpleUploadedFile("test_audit.txt", b"Hello Secure Ops", content_type="text/plain")
        
        # Upload
        res_upload = self.client.post(
            f'/api/devices/{self.device.id}/files/upload/',
            {'path': 'C:\\Users\\550047\\Desktop', 'file': upload_file, 'overwrite': 'true'},
            format='multipart'
        )
        self.assertEqual(res_upload.status_code, 201)

        # Download
        res_dl = self.client.get(
            f'/api/devices/{self.device.id}/files/download/',
            {'path': 'C:\\Users\\550047\\Desktop\\test_audit.txt'}
        )
        self.assertEqual(res_dl.status_code, 200)
        content = b"".join(res_dl.streaming_content)
        self.assertEqual(content, b"Hello Secure Ops")

    @patch('apps.connectors.windows.WindowsConnector.get_file_content')
    def test_file_preview_api(self, mock_get_content):
        """Tests GET /api/devices/{id}/files/preview/."""
        mock_get_content.return_value = '{"subnet": "10.20.15.0/24"}'
        response = self.client.get(
            f'/api/devices/{self.device.id}/files/preview/',
            {'path': 'C:\\Users\\550047\\Desktop\\network_config.json'}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['language'], 'json')
        self.assertIn('subnet', data['content'])
