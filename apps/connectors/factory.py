"""
Connector Factory for ZK Remote Operations Center.
Instantiates and manages 100% real connector instances based on device configuration.
No mock connectors or simulated fallback.
"""

from typing import Dict
from .base import DeviceConnector
from .linux import LinuxConnector
from .windows import WindowsConnector


_CONNECTOR_CACHE: Dict[str, DeviceConnector] = {}


class ConnectorFactory:
    """
    Factory creating and caching active DeviceConnector instances.
    Uses 100% Real Paramiko SSH/SFTP connectors for Linux and OpenSSH/WinRM for Windows.
    Zero mock simulation or fallback.
    """

    @classmethod
    def get_connector(cls, device) -> DeviceConnector:
        device_id_str = str(device.id)

        # Check if already cached
        if device_id_str in _CONNECTOR_CACHE:
            connector = _CONNECTOR_CACHE[device_id_str]
            # Update device reference in case attributes changed
            connector.device = device
            return connector

        if device.operating_system == 'WINDOWS' or getattr(device, 'connector_type', None) == 'WINDOWS_REMOTE':
            connector = WindowsConnector(device)
        else:
            connector = LinuxConnector(device)

        _CONNECTOR_CACHE[device_id_str] = connector
        return connector

    @classmethod
    def close_connector(cls, device_id: str):
        """Cleans up and removes a cached connector."""
        device_id_str = str(device_id)
        if device_id_str in _CONNECTOR_CACHE:
            try:
                _CONNECTOR_CACHE[device_id_str].disconnect()
            except Exception:
                pass
            del _CONNECTOR_CACHE[device_id_str]

    @classmethod
    def clear_all(cls):
        """Disconnects all cached connectors."""
        for device_id, connector in list(_CONNECTOR_CACHE.items()):
            try:
                connector.disconnect()
            except Exception:
                pass
        _CONNECTOR_CACHE.clear()
