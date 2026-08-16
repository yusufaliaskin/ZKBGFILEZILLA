from django.test import TestCase
from apps.devices.models import Device, DeviceOS, ConnectorType
from apps.connectors.factory import ConnectorFactory
from apps.connectors.exceptions import PathTraversalException
from apps.files.validators import validate_safe_path


class ConnectorLayerTestCase(TestCase):
    def setUp(self):
        self.win_device = Device.objects.create(
            personnel_number='550047',
            hostname='ZK34990NX0814',
            operating_system=DeviceOS.WINDOWS,
            ip_address='10.20.15.42',
            username='550047',
            connector_type=ConnectorType.WINDOWS_REMOTE
        )
        self.linux_device = Device.objects.create(
            personnel_number='550081',
            hostname='ZK34990NX0921',
            operating_system=DeviceOS.LINUX,
            ip_address='10.20.15.88',
            username='550081',
            connector_type=ConnectorType.SSH
        )

    def test_factory_instantiation(self):
        """Tests that ConnectorFactory properly instantiates connectors."""
        win_conn = ConnectorFactory.get_connector(self.win_device)
        linux_conn = ConnectorFactory.get_connector(self.linux_device)
        self.assertIsNotNone(win_conn)
        self.assertIsNotNone(linux_conn)

    def test_path_traversal_protection(self):
        """Tests that path traversal is strictly blocked by path validator."""
        with self.assertRaises(PathTraversalException):
            validate_safe_path('/home/550081/../../../etc')
