"""
Abstract Base Class for all Device Connectors in ZK Remote Operations Center.
Ensures Django views remain completely decoupled from OS-specific logic.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, BinaryIO
from datetime import datetime


@dataclass
class FileEntry:
    name: str
    path: str
    is_dir: bool
    size: int = 0
    modified_time: Optional[datetime] = None
    permissions: str = ''
    owner: str = ''
    group: str = ''
    extension: str = ''
    is_hidden: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'path': self.path,
            'is_dir': self.is_dir,
            'size': self.size,
            'modified_time': self.modified_time.isoformat() if self.modified_time else None,
            'permissions': self.permissions,
            'owner': self.owner,
            'group': self.group,
            'extension': self.extension,
            'is_hidden': self.is_hidden,
        }


@dataclass
class FileInfo:
    name: str
    path: str
    is_dir: bool
    size: int = 0
    created_time: Optional[datetime] = None
    modified_time: Optional[datetime] = None
    accessed_time: Optional[datetime] = None
    permissions: str = ''
    owner: str = ''
    mime_type: str = 'application/octet-stream'
    checksum_md5: Optional[str] = None
    is_readable: bool = True
    is_writable: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'path': self.path,
            'is_dir': self.is_dir,
            'size': self.size,
            'created_time': self.created_time.isoformat() if self.created_time else None,
            'modified_time': self.modified_time.isoformat() if self.modified_time else None,
            'accessed_time': self.accessed_time.isoformat() if self.accessed_time else None,
            'permissions': self.permissions,
            'owner': self.owner,
            'mime_type': self.mime_type,
            'checksum_md5': self.checksum_md5,
            'is_readable': self.is_readable,
            'is_writable': self.is_writable,
        }


@dataclass
class SystemInfo:
    hostname: str
    operating_system: str
    os_version: str
    cpu_usage_percent: float = 0.0
    memory_total_bytes: int = 0
    memory_used_bytes: int = 0
    memory_usage_percent: float = 0.0
    disk_total_bytes: int = 0
    disk_used_bytes: int = 0
    disk_usage_percent: float = 0.0
    uptime_seconds: int = 0
    uptime_display: str = ''
    logged_in_user: str = ''
    ip_address: str = ''
    mac_address: str = ''
    domain: str = ''

    def to_dict(self) -> Dict[str, Any]:
        return {
            'hostname': self.hostname,
            'operating_system': self.operating_system,
            'os_version': self.os_version,
            'cpu_usage_percent': round(self.cpu_usage_percent, 1),
            'memory_total_bytes': self.memory_total_bytes,
            'memory_used_bytes': self.memory_used_bytes,
            'memory_usage_percent': round(self.memory_usage_percent, 1),
            'disk_total_bytes': self.disk_total_bytes,
            'disk_used_bytes': self.disk_used_bytes,
            'disk_usage_percent': round(self.disk_usage_percent, 1),
            'uptime_seconds': self.uptime_seconds,
            'uptime_display': self.uptime_display,
            'logged_in_user': self.logged_in_user,
            'ip_address': self.ip_address,
            'mac_address': self.mac_address,
            'domain': self.domain,
        }


@dataclass
class ConnectionResult:
    success: bool
    status: str  # 'ONLINE', 'OFFLINE', 'WARNING'
    latency_ms: float = 0.0
    message: str = ''
    error_code: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'status': self.status,
            'latency_ms': round(self.latency_ms, 2),
            'message': self.message,
            'error_code': self.error_code,
            'details': self.details,
        }


class DeviceConnector(ABC):
    """
    Abstract Base Class for all remote device connectors.
    """

    def __init__(self, device):
        self.device = device
        self.is_connected = False

    @abstractmethod
    def connect(self) -> bool:
        """Establishes connection to the remote device."""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Closes connection cleanly."""
        pass

    @abstractmethod
    def test_connection(self) -> ConnectionResult:
        """Tests connectivity and returns standardized ConnectionResult."""
        pass

    @abstractmethod
    def list_directory(self, path: Optional[str] = None) -> List[FileEntry]:
        """Lists files and subdirectories in the specified path."""
        pass

    @abstractmethod
    def get_file_content(self, path: str, max_bytes: int = 1048576) -> str:
        """Retrieves text content of a file for preview (up to max_bytes)."""
        pass

    @abstractmethod
    def save_file_content(self, path: str, content: str) -> None:
        """Saves edited text content to a remote file."""
        pass

    @abstractmethod
    def download_file(self, path: str) -> BinaryIO:
        """Returns a binary stream of the file content for downloading."""
        pass

    @abstractmethod
    def upload_file(self, path: str, file_obj: BinaryIO, overwrite: bool = False) -> None:
        """Uploads a file to the remote directory."""
        pass

    @abstractmethod
    def create_directory(self, path: str) -> None:
        """Creates a directory at the given path."""
        pass

    @abstractmethod
    def delete_item(self, path: str) -> None:
        """Deletes a file or directory."""
        pass

    @abstractmethod
    def rename_item(self, old_path: str, new_name: str) -> str:
        """Renames a file or directory. Returns the new full path."""
        pass

    @abstractmethod
    def move_item(self, src_path: str, dst_path: str) -> None:
        """Moves a file or directory to a new directory."""
        pass

    @abstractmethod
    def copy_item(self, src_path: str, dst_path: str) -> None:
        """Copies a file to a new destination."""
        pass

    @abstractmethod
    def get_file_info(self, path: str) -> FileInfo:
        """Retrieves detailed properties of a file or directory."""
        pass

    @abstractmethod
    def get_system_info(self) -> SystemInfo:
        """Fetches live normalized system information from the device."""
        pass

    @abstractmethod
    def get_path_separator(self) -> str:
        """Returns the OS path separator ('\\' for Windows, '/' for Linux)."""
        pass

    @abstractmethod
    def get_default_path(self) -> str:
        """Returns default starting directory for browsing."""
        pass

    @abstractmethod
    def get_root_paths(self) -> List[Dict[str, str]]:
        """Returns list of root drives or mount points."""
        pass

    @abstractmethod
    def execute_command(self, command: str) -> Dict[str, Any]:
        """Executes a remote command/terminal script and returns output & exit code."""
        pass
