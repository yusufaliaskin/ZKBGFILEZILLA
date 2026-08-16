"""
LinuxConnector for ZK Remote Operations Center.
Uses Paramiko for secure SSH/SFTP communication with authorized Linux servers and workstations.
"""

import io
import posixpath
import paramiko
from datetime import datetime
from typing import List, Dict, Any, Optional, BinaryIO

from .base import DeviceConnector, FileEntry, FileInfo, SystemInfo, ConnectionResult
from .exceptions import (
    ConnectorException,
    ConnectionFailedException,
    AuthenticationFailedException,
    FileNotFoundException,
    PermissionDeniedException,
    PathTraversalException
)


class LinuxConnector(DeviceConnector):
    """
    Paramiko SSH/SFTP connector for remote Linux systems.
    Only initiated with authorized credentials.
    """

    def __init__(self, device):
        super().__init__(device)
        self.ssh_client: Optional[paramiko.SSHClient] = None
        self.sftp_client: Optional[paramiko.SFTPClient] = None

    def connect(self) -> bool:
        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            # Retrieve encrypted credentials safely
            password = None
            key_filename = None
            if hasattr(self.device, 'credential'):
                cred = self.device.credential
                if cred.credential_type == 'PASSWORD':
                    password = cred.get_secret()
                elif cred.credential_type == 'SSH_KEY':
                    key_filename = cred.ssh_key_path

            self.ssh_client.connect(
                hostname=self.device.ip_address,
                port=self.device.port or 22,
                username=self.device.username,
                password=password,
                key_filename=key_filename,
                timeout=10,
                banner_timeout=15
            )
            self.sftp_client = self.ssh_client.open_sftp()
            self.is_connected = True
            return True
        except paramiko.AuthenticationException as e:
            raise AuthenticationFailedException(f"SSH kimlik doğrulama hatası: {str(e)}")
        except Exception as e:
            raise ConnectionFailedException(f"SSH bağlantı hatası: {str(e)}")

    def disconnect(self) -> None:
        if self.sftp_client:
            try:
                self.sftp_client.close()
            except Exception:
                pass
            self.sftp_client = None

        if self.ssh_client:
            try:
                self.ssh_client.close()
            except Exception:
                pass
            self.ssh_client = None

        self.is_connected = False

    def test_connection(self) -> ConnectionResult:
        try:
            self.connect()
            self.disconnect()
            return ConnectionResult(
                success=True,
                status='ONLINE',
                message='SSH/SFTP bağlantısı başarılı.'
            )
        except Exception as e:
            return ConnectionResult(
                success=False,
                status='OFFLINE',
                message=str(e),
                error_code='SSH_CONNECT_ERROR'
            )

    def list_directory(self, path: Optional[str] = None) -> List[FileEntry]:
        if not self.is_connected:
            self.connect()
        path = path or self.get_default_path()
        try:
            attrs = self.sftp_client.listdir_attr(path)
            entries = []
            for a in attrs:
                is_dir = (a.st_mode & 0o040000) != 0
                entries.append(FileEntry(
                    name=a.filename,
                    path=posixpath.join(path, a.filename),
                    is_dir=is_dir,
                    size=a.st_size if not is_dir else 0,
                    modified_time=datetime.fromtimestamp(a.st_mtime),
                    permissions=oct(a.st_mode)[-4:],
                    owner=str(a.st_uid),
                    extension=a.filename.rsplit('.', 1)[-1].lower() if '.' in a.filename else ''
                ))
            return entries
        except IOError as e:
            raise FileNotFoundException(f"Dizin okunamadı: {str(e)}")

    def get_file_content(self, path: str, max_bytes: int = 1048576) -> str:
        if not self.is_connected:
            self.connect()
        with self.sftp_client.open(path, 'r') as f:
            return f.read(max_bytes).decode('utf-8', errors='replace')

    def save_file_content(self, path: str, content: str) -> None:
        if not self.is_connected:
            self.connect()
        with self.sftp_client.open(path, 'w') as f:
            f.write(content.encode('utf-8'))

    def download_file(self, path: str) -> BinaryIO:
        if not self.is_connected:
            self.connect()
        buf = io.BytesIO()
        self.sftp_client.getfo(path, buf)
        buf.seek(0)
        return buf

    def upload_file(self, path: str, file_obj: BinaryIO, overwrite: bool = False) -> None:
        if not self.is_connected:
            self.connect()
        self.sftp_client.putfo(file_obj, path)

    def create_directory(self, path: str) -> None:
        if not self.is_connected:
            self.connect()
        # Run real `mkdir -p` via SSH on Linux host
        res = self.execute_command(f'mkdir -p "{path}"')
        if not res.get('success'):
            try:
                self.sftp_client.mkdir(path)
            except Exception as e:
                raise ConnectorException(f"Klasör oluşturulamadı: {res.get('output') or str(e)}")

    def delete_item(self, path: str) -> None:
        if not self.is_connected:
            self.connect()
        # Run real recursive `rm -rf` via SSH on Linux host
        res = self.execute_command(f'rm -rf "{path}"')
        if not res.get('success'):
            try:
                self.sftp_client.remove(path)
            except IOError:
                try:
                    self.sftp_client.rmdir(path)
                except Exception as e:
                    raise ConnectorException(f"Silme başarısız: {res.get('output') or str(e)}")

    def rename_item(self, old_path: str, new_name: str) -> str:
        if not self.is_connected:
            self.connect()
        parent_dir = posixpath.dirname(old_path)
        new_path = posixpath.join(parent_dir, new_name)
        res = self.execute_command(f'mv "{old_path}" "{new_path}"')
        if not res.get('success'):
            try:
                self.sftp_client.rename(old_path, new_path)
            except Exception as e:
                raise ConnectorException(f"Yeniden adlandırılamadı: {res.get('output') or str(e)}")
        return new_path

    def move_item(self, src_path: str, dst_dir: str) -> None:
        if not self.is_connected:
            self.connect()
        name = posixpath.basename(src_path)
        new_path = posixpath.join(dst_dir, name)
        self.sftp_client.rename(src_path, new_path)

    def copy_item(self, src_path: str, dst_dir: str) -> None:
        if not self.is_connected:
            self.connect()
        buf = self.download_file(src_path)
        name = posixpath.basename(src_path)
        new_path = posixpath.join(dst_dir, name)
        self.upload_file(new_path, buf, overwrite=True)

    def get_file_info(self, path: str) -> FileInfo:
        if not self.is_connected:
            self.connect()
        attr = self.sftp_client.stat(path)
        is_dir = (attr.st_mode & 0o040000) != 0
        name = posixpath.basename(path)
        return FileInfo(
            name=name,
            path=path,
            is_dir=is_dir,
            size=attr.st_size if not is_dir else 0,
            modified_time=datetime.fromtimestamp(attr.st_mtime),
            permissions=oct(attr.st_mode)[-4:],
            owner=str(attr.st_uid)
        )

    def get_system_info(self) -> SystemInfo:
        if not self.is_connected:
            self.connect()
        # Execute light diagnostic commands via SSH
        stdin, stdout, stderr = self.ssh_client.exec_command("uname -r; uptime -p; free -b; df -b /")
        lines = stdout.read().decode('utf-8').splitlines()
        uptime = lines[1] if len(lines) > 1 else 'N/A'
        return SystemInfo(
            hostname=self.device.hostname,
            operating_system='Linux',
            os_version=lines[0] if lines else 'Linux Generic',
            uptime_display=uptime,
            ip_address=self.device.ip_address
        )

    def get_path_separator(self) -> str:
        return '/'

    def get_default_path(self) -> str:
        return f"/home/{self.device.username or 'root'}"

    def get_root_paths(self) -> List[Dict[str, str]]:
        return [{'name': 'Root (/)', 'path': '/'}]

    def execute_command(self, command: str) -> Dict[str, Any]:
        """Executes shell command remotely via SSH and returns real stdout, stderr and exit code."""
        if not self.is_connected:
            self.connect()

        if not self.ssh_client:
            raise ConnectionFailedException("SSH bağlantısı kurulu değil.")

        try:
            stdin, stdout, stderr = self.ssh_client.exec_command(command, timeout=30)
            out_str = stdout.read().decode('utf-8', errors='replace')
            err_str = stderr.read().decode('utf-8', errors='replace')
            exit_status = stdout.channel.recv_exit_status()
            combined = out_str if out_str else err_str
            return {
                'output': combined,
                'stdout': out_str,
                'stderr': err_str,
                'exit_code': exit_status,
                'success': exit_status == 0
            }
        except Exception as e:
            raise ConnectorException(f"SSH komut çalıştırma hatası: {str(e)}")


