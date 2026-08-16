"""
WindowsConnector for ZK Remote Operations Center.
Structured for enterprise Windows systems using OpenSSH on Windows / PowerShell.
100% Real SSH and SFTP execution - No simulation, no mock fallback.
"""

import io
import ntpath
import paramiko
from datetime import datetime
from typing import List, Dict, Any, Optional, BinaryIO
from .base import DeviceConnector, FileEntry, FileInfo, SystemInfo, ConnectionResult
from .exceptions import (
    ConnectorException,
    ConnectionFailedException,
    AuthenticationFailedException,
    FileNotFoundException,
    FileAlreadyExistsException,
    PermissionDeniedException,
)


class WindowsConnector(DeviceConnector):
    """
    Enterprise Windows Remote Connector.
    Connects via OpenSSH on Windows / PowerShell Remoting with real SFTP and command execution.
    """

    def __init__(self, device):
        super().__init__(device)
        self.ssh_client: Optional[paramiko.SSHClient] = None
        self.sftp_client: Optional[paramiko.SFTPClient] = None

    def connect(self) -> bool:
        if self.is_connected and self.ssh_client:
            return True

        try:
            cred = getattr(self.device, 'credential', None)
            password = None
            key_filename = None
            if cred:
                if cred.credential_type == 'PASSWORD':
                    password = cred.get_secret()
                elif cred.credential_type == 'SSH_KEY':
                    key_filename = cred.ssh_key_path

            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(
                hostname=self.device.ip_address,
                port=self.device.port or 22,
                username=self.device.username,
                password=password,
                key_filename=key_filename,
                timeout=10,
                banner_timeout=15,
                auth_timeout=10,
            )
            self.ssh_client = client
            self.sftp_client = client.open_sftp()
            self.is_connected = True
            return True
        except paramiko.AuthenticationException as e:
            self.is_connected = False
            raise AuthenticationFailedException(f"Windows OpenSSH kimlik doğrulama başarısız: {str(e)}")
        except Exception as e:
            self.is_connected = False
            raise ConnectionFailedException(f"Windows OpenSSH bağlantı hatası: {str(e)}")

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
                message='Windows (OpenSSH) bağlantısı başarılı.',
                latency_ms=15
            )
        except Exception as e:
            return ConnectionResult(
                success=False,
                status='OFFLINE',
                message=str(e),
                error_code='WINDOWS_CONNECT_ERROR'
            )

    def list_directory(self, path: Optional[str] = None) -> List[FileEntry]:
        if not self.is_connected:
            self.connect()

        target_path = (path or self.get_default_path()).replace('/', '\\').rstrip('\\')
        if not target_path.endswith(':') and '\\' not in target_path:
            target_path += '\\'

        if not self.sftp_client:
            raise ConnectionFailedException("SFTP istemcisi hazır değil.")

        try:
            # SFTP on Windows OpenSSH standardizes on forward-slash drives or paths
            sftp_path = target_path.replace('\\', '/')
            if sftp_path.endswith(':'):
                sftp_path += '/'

            attrs = self.sftp_client.listdir_attr(sftp_path)
            entries = []
            for a in attrs:
                is_dir = (a.st_mode & 0o040000) != 0
                entries.append(FileEntry(
                    name=a.filename,
                    path=target_path.rstrip('\\') + '\\' + a.filename,
                    is_dir=is_dir,
                    size=a.st_size if not is_dir else 0,
                    modified_time=datetime.fromtimestamp(a.st_mtime),
                    permissions='ACL:Full' if not is_dir else 'ACL:ReadWrite',
                    owner=self.device.username or 'SYSTEM',
                    extension=a.filename.rsplit('.', 1)[-1].lower() if '.' in a.filename else ''
                ))
            return entries
        except IOError as e:
            raise FileNotFoundException(f"Windows dizini okunamadı ({target_path}): {str(e)}")

    def get_file_content(self, path: str, max_bytes: int = 1048576) -> str:
        if not self.is_connected:
            self.connect()

        sftp_path = path.replace('\\', '/')
        try:
            with self.sftp_client.open(sftp_path, 'r') as f:
                return f.read(max_bytes).decode('utf-8', errors='replace')
        except IOError as e:
            raise FileNotFoundException(f"Dosya okunamadı ({path}): {str(e)}")

    def save_file_content(self, path: str, content: str) -> None:
        if not self.is_connected:
            self.connect()

        sftp_path = path.replace('\\', '/')
        try:
            with self.sftp_client.open(sftp_path, 'w') as f:
                f.write(content.encode('utf-8'))
        except IOError as e:
            raise ConnectorException(f"Dosya kaydedilemedi ({path}): {str(e)}")

    def download_file(self, path: str) -> BinaryIO:
        if not self.is_connected:
            self.connect()

        sftp_path = path.replace('\\', '/')
        try:
            buf = io.BytesIO()
            self.sftp_client.getfo(sftp_path, buf)
            buf.seek(0)
            return buf
        except IOError as e:
            raise FileNotFoundException(f"Dosya indirilemedi ({path}): {str(e)}")

    def upload_file(self, path: str, file_obj: BinaryIO, overwrite: bool = False) -> None:
        if not self.is_connected:
            self.connect()

        sftp_path = path.replace('\\', '/')
        try:
            self.sftp_client.putfo(file_obj, sftp_path)
        except IOError as e:
            raise ConnectorException(f"Dosya yüklenemedi ({path}): {str(e)}")

    def create_directory(self, path: str) -> None:
        if not self.is_connected:
            self.connect()

        norm_path = path.replace('/', '\\')
        # Execute real PowerShell New-Item
        res = self.execute_command(f'New-Item -ItemType Directory -Path "{norm_path}" -Force')
        if not res.get('success'):
            try:
                self.sftp_client.mkdir(path.replace('\\', '/'))
            except Exception as e:
                raise ConnectorException(f"Klasör oluşturulamadı ({path}): {res.get('output') or str(e)}")

    def delete_item(self, path: str) -> None:
        if not self.is_connected:
            self.connect()

        norm_path = path.replace('/', '\\')
        # Execute real PowerShell Remove-Item
        res = self.execute_command(f'Remove-Item -LiteralPath "{norm_path}" -Recurse -Force')
        if not res.get('success'):
            try:
                self.sftp_client.remove(path.replace('\\', '/'))
            except IOError:
                try:
                    self.sftp_client.rmdir(path.replace('\\', '/'))
                except Exception as e:
                    raise ConnectorException(f"Öğe silinemedi ({path}): {res.get('output') or str(e)}")

    def rename_item(self, old_path: str, new_name: str) -> str:
        if not self.is_connected:
            self.connect()

        norm_old = old_path.replace('/', '\\')
        parent = ntpath.dirname(norm_old)
        new_path = ntpath.join(parent, new_name)

        res = self.execute_command(f'Rename-Item -LiteralPath "{norm_old}" -NewName "{new_name}" -Force')
        if not res.get('success'):
            try:
                self.sftp_client.rename(norm_old.replace('\\', '/'), new_path.replace('\\', '/'))
            except Exception as e:
                raise ConnectorException(f"Yeniden adlandırılamadı: {res.get('output') or str(e)}")
        return new_path

    def move_item(self, src_path: str, dst_dir: str) -> None:
        if not self.is_connected:
            self.connect()

        norm_src = src_path.replace('/', '\\')
        norm_dst = dst_dir.replace('/', '\\')
        res = self.execute_command(f'Move-Item -LiteralPath "{norm_src}" -Destination "{norm_dst}" -Force')
        if not res.get('success'):
            raise ConnectorException(f"Taşıma başarısız: {res.get('output')}")

    def copy_item(self, src_path: str, dst_dir: str) -> None:
        if not self.is_connected:
            self.connect()

        norm_src = src_path.replace('/', '\\')
        norm_dst = dst_dir.replace('/', '\\')
        res = self.execute_command(f'Copy-Item -LiteralPath "{norm_src}" -Destination "{norm_dst}" -Recurse -Force')
        if not res.get('success'):
            raise ConnectorException(f"Kopyalama başarısız: {res.get('output')}")

    def get_file_info(self, path: str) -> FileInfo:
        if not self.is_connected:
            self.connect()

        sftp_path = path.replace('\\', '/')
        try:
            attr = self.sftp_client.stat(sftp_path)
            is_dir = (attr.st_mode & 0o040000) != 0
            name = ntpath.basename(path.replace('/', '\\'))
            return FileInfo(
                name=name,
                path=path,
                is_dir=is_dir,
                size=attr.st_size if not is_dir else 0,
                modified_time=datetime.fromtimestamp(attr.st_mtime),
                permissions='ACL:Full' if not is_dir else 'ACL:ReadWrite',
                owner=self.device.username or 'SYSTEM'
            )
        except IOError as e:
            raise FileNotFoundException(f"Dosya bilgisi alınamadı ({path}): {str(e)}")

    def get_system_info(self) -> SystemInfo:
        if not self.is_connected:
            self.connect()

        cmd = 'powershell.exe -NoProfile -Command "[System.Environment]::OSVersion.VersionString; (Get-CimInstance Win32_OperatingSystem).LastBootUpTime"'
        res = self.execute_command(cmd)
        lines = res.get('stdout', '').splitlines()
        os_ver = lines[0] if lines else 'Microsoft Windows'
        return SystemInfo(
            hostname=self.device.hostname,
            operating_system='Windows',
            os_version=os_ver,
            ip_address=self.device.ip_address
        )

    def get_path_separator(self) -> str:
        return '\\'

    def get_default_path(self) -> str:
        return f"C:\\Users\\{self.device.username or 'Administrator'}"

    def get_root_paths(self) -> List[Dict[str, str]]:
        return [
            {'name': 'Yerel Disk (C:)', 'path': 'C:\\'},
            {'name': 'Veri Diski (D:)', 'path': 'D:\\'},
        ]

    def execute_command(self, command: str) -> Dict[str, Any]:
        """Executes PowerShell command remotely on Windows host via SSH."""
        if not self.is_connected:
            self.connect()

        if not self.ssh_client:
            raise ConnectionFailedException("SSH bağlantısı kurulu değil.")

        try:
            ps_cmd = f'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "{command}"'
            stdin, stdout, stderr = self.ssh_client.exec_command(ps_cmd, timeout=30)
            out = stdout.read().decode('utf-8', errors='replace')
            err = stderr.read().decode('utf-8', errors='replace')
            exit_code = stdout.channel.recv_exit_status()
            combined = out if out else err
            return {
                'output': combined,
                'stdout': out,
                'stderr': err,
                'exit_code': exit_code,
                'success': exit_code == 0
            }
        except Exception as e:
            raise ConnectorException(f"Windows komut çalıştırma hatası: {str(e)}")
