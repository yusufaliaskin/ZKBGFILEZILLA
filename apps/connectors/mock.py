"""
MockConnector for ZK Remote Operations Center.
Provides high-fidelity simulated file system and system metrics for development and testing.
Maintains persistent in-memory filesystem per device instance.
"""

import io
import time
import posixpath
import ntpath
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, BinaryIO

from .base import DeviceConnector, FileEntry, FileInfo, SystemInfo, ConnectionResult
from .exceptions import (
    FileNotFoundException,
    FileAlreadyExistsException,
    PathTraversalException,
    PermissionDeniedException
)


# Global in-memory virtual filesystem storage per device ID
_MOCK_FILESYSTEMS: Dict[str, Dict[str, Any]] = {}


def _get_initial_windows_fs(device) -> Dict[str, Any]:
    """Generates a rich realistic Windows file tree."""
    user = device.personnel_number or '550047'
    now = datetime.now()
    
    fs = {
        'C:\\': {'type': 'dir', 'mtime': now - timedelta(days=120), 'perm': 'rwxr-xr-x', 'owner': 'SYSTEM'},
        'C:\\Users': {'type': 'dir', 'mtime': now - timedelta(days=90), 'perm': 'rwxr-xr-x', 'owner': 'SYSTEM'},
        f'C:\\Users\\{user}': {'type': 'dir', 'mtime': now - timedelta(days=5), 'perm': 'rwx------', 'owner': user},
        f'C:\\Users\\{user}\\Desktop': {'type': 'dir', 'mtime': now - timedelta(hours=2), 'perm': 'rwx------', 'owner': user},
        f'C:\\Users\\{user}\\Documents': {'type': 'dir', 'mtime': now - timedelta(days=1), 'perm': 'rwx------', 'owner': user},
        f'C:\\Users\\{user}\\Downloads': {'type': 'dir', 'mtime': now - timedelta(days=3), 'perm': 'rwx------', 'owner': user},
        
        # Files on Desktop
        f'C:\\Users\\{user}\\Desktop\\Financial_Report_Q3.pdf': {
            'type': 'file',
            'content': b'%PDF-1.5 Confidential Banking Operational Audit Summary 2026',
            'mtime': now - timedelta(hours=3),
            'perm': 'rw-r--r--',
            'owner': user
        },
        f'C:\\Users\\{user}\\Desktop\\network_config.json': {
            'type': 'file',
            'content': b'{\n  "datacenter": "IST-DC-01",\n  "subnet": "10.20.15.0/24",\n  "gateway": "10.20.15.1",\n  "dns_servers": ["10.20.1.10", "10.20.1.11"],\n  "vlan": 142\n}',
            'mtime': now - timedelta(days=2),
            'perm': 'rw-r--r--',
            'owner': user
        },
        f'C:\\Users\\{user}\\Desktop\\daily_tasks.txt': {
            'type': 'file',
            'content': b'1. Review system audit logs\n2. Check pending secure transfers\n3. Validate TLS certificates on edge nodes\n4. Update operator credentials\n',
            'mtime': now - timedelta(days=1),
            'perm': 'rw-r--r--',
            'owner': user
        },
        
        # Files in Documents
        f'C:\\Users\\{user}\\Documents\\Security_Policy_v4.docx': {
            'type': 'file',
            'content': b'[PK-ZIP binary Word Document data - ZK Remote Security Policy]',
            'mtime': now - timedelta(days=10),
            'perm': 'rw-r--r--',
            'owner': user
        },
        f'C:\\Users\\{user}\\Documents\\audit_checklist.xlsx': {
            'type': 'file',
            'content': b'[Excel Binary Workbook - PCI-DSS and Banking Regulations]',
            'mtime': now - timedelta(days=8),
            'perm': 'rw-r--r--',
            'owner': user
        },
        
        # System Dirs
        'C:\\Windows': {'type': 'dir', 'mtime': now - timedelta(days=300), 'perm': 'r-xr-xr-x', 'owner': 'SYSTEM'},
        'C:\\Windows\\System32': {'type': 'dir', 'mtime': now - timedelta(days=300), 'perm': 'r-xr-xr-x', 'owner': 'SYSTEM'},
        'C:\\Windows\\system.ini': {
            'type': 'file',
            'content': b'; for 16-bit app support\n[drivers]\nwave=mmdrv.dll\ntimer=timer.drv\n[mci]\n',
            'mtime': now - timedelta(days=300),
            'perm': 'r--r--r--',
            'owner': 'SYSTEM'
        },
        'C:\\Program Files': {'type': 'dir', 'mtime': now - timedelta(days=180), 'perm': 'rwxr-xr-x', 'owner': 'SYSTEM'},
        'C:\\Program Files\\ZK Security Agent': {'type': 'dir', 'mtime': now - timedelta(days=20), 'perm': 'rwxr-xr-x', 'owner': 'SYSTEM'},
        'C:\\Program Files\\ZK Security Agent\\agent.conf': {
            'type': 'file',
            'content': b'# ZK Agent Configuration\nserver_host=ops.internal.bank.com\nport=5985\nheartbeat_interval=30\naudit_level=VERBOSE\n',
            'mtime': now - timedelta(days=20),
            'perm': 'rw-r--r--',
            'owner': 'SYSTEM'
        },
        'C:\\Program Files\\ZK Security Agent\\agent.log': {
            'type': 'file',
            'content': b'[2026-08-16 00:01:10] INFO: Agent service started\n[2026-08-16 00:15:22] INFO: Heartbeat sent successfully\n[2026-08-16 00:30:45] INFO: Connection check OK\n',
            'mtime': now - timedelta(minutes=5),
            'perm': 'rw-r--r--',
            'owner': 'SYSTEM'
        },
    }
    return fs


def _get_initial_linux_fs(device) -> Dict[str, Any]:
    """Generates a rich realistic Linux file tree."""
    user = device.personnel_number or '550081'
    now = datetime.now()
    
    fs = {
        '/': {'type': 'dir', 'mtime': now - timedelta(days=200), 'perm': 'rwxr-xr-x', 'owner': 'root'},
        '/etc': {'type': 'dir', 'mtime': now - timedelta(days=60), 'perm': 'rwxr-xr-x', 'owner': 'root'},
        '/etc/nginx': {'type': 'dir', 'mtime': now - timedelta(days=30), 'perm': 'rwxr-xr-x', 'owner': 'root'},
        '/etc/nginx/nginx.conf': {
            'type': 'file',
            'content': b'user nginx;\nworker_processes auto;\nerror_log /var/log/nginx/error.log warn;\npid /var/run/nginx.pid;\n\nevents {\n    worker_connections 1024;\n}\n\nhttp {\n    include /etc/nginx/mime.types;\n    default_type application/octet-stream;\n    sendfile on;\n    keepalive_timeout 65;\n    server {\n        listen 80;\n        server_name localhost;\n        location / {\n            root /usr/share/nginx/html;\n            index index.html;\n        }\n    }\n}\n',
            'mtime': now - timedelta(days=15),
            'perm': 'rw-r--r--',
            'owner': 'root'
        },
        '/etc/hosts': {
            'type': 'file',
            'content': b'127.0.0.1   localhost localhost.localdomain\n::1         localhost6 localhost6.localdomain6\n10.20.15.10 ops-master.internal.bank.com\n10.20.15.11 ops-backup.internal.bank.com\n',
            'mtime': now - timedelta(days=100),
            'perm': 'rw-r--r--',
            'owner': 'root'
        },
        '/etc/os-release': {
            'type': 'file',
            'content': b'NAME="Ubuntu"\nVERSION="24.04 LTS (Noble Numbat)"\nID=ubuntu\nID_LIKE=debian\nPRETTY_NAME="Ubuntu 24.04 LTS"\nVERSION_ID="24.04"\n',
            'mtime': now - timedelta(days=120),
            'perm': 'r--r--r--',
            'owner': 'root'
        },
        '/home': {'type': 'dir', 'mtime': now - timedelta(days=150), 'perm': 'rwxr-xr-x', 'owner': 'root'},
        f'/home/{user}': {'type': 'dir', 'mtime': now - timedelta(days=2), 'perm': 'rwxr-x---', 'owner': user},
        f'/home/{user}/scripts': {'type': 'dir', 'mtime': now - timedelta(days=5), 'perm': 'rwxr-xr-x', 'owner': user},
        f'/home/{user}/scripts/backup.sh': {
            'type': 'file',
            'content': b'#!/bin/bash\nset -euo pipefail\nBACKUP_DIR="/var/backups/zk_ops"\nTIMESTAMP=$(date +%Y%m%d_%H%M%S)\nmkdir -p "$BACKUP_DIR"\ntar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" /etc/nginx /opt/zk-agent\necho "[$(date)] Backup completed successfully."\n',
            'mtime': now - timedelta(days=4),
            'perm': 'rwxr-xr-x',
            'owner': user
        },
        f'/home/{user}/scripts/deploy.py': {
            'type': 'file',
            'content': b'"""\nDeployment automation script for ZK Remote Operations Center agent.\n"""\nimport sys\nimport os\n\ndef main():\n    print("Starting automated service deployment...")\n    print("Checking system requirements: OK")\n    print("Deploying version 2.4.0-stable...")\n    print("Deployment finished successfully.")\n\nif __name__ == "__main__":\n    main()\n',
            'mtime': now - timedelta(days=2),
            'perm': 'rwxr-xr-x',
            'owner': user
        },
        f'/home/{user}/notes.txt': {
            'type': 'file',
            'content': b'Operations Checklist:\n- Verify daily SFTP sync with DC-02\n- Check kernel updates for CVE-2026-X\n- Monitor memory consumption on worker pods\n',
            'mtime': now - timedelta(hours=6),
            'perm': 'rw-r--r--',
            'owner': user
        },
        '/var': {'type': 'dir', 'mtime': now - timedelta(days=200), 'perm': 'rwxr-xr-x', 'owner': 'root'},
        '/var/log': {'type': 'dir', 'mtime': now - timedelta(days=10), 'perm': 'rwxr-xr-x', 'owner': 'root'},
        '/var/log/syslog': {
            'type': 'file',
            'content': b'Aug 16 00:00:01 node-0921 systemd[1]: Starting Daily apt download activities...\nAug 16 00:15:33 node-0921 sshd[4821]: Accepted publickey for 550081 from 10.20.15.5 port 52144\nAug 16 00:28:10 node-0921 kernel: [ 4810.124] [UFW BLOCK] IN=eth0 OUT= SRC=10.20.99.4 PROTO=TCP DPT=23\n',
            'mtime': now - timedelta(minutes=2),
            'perm': 'rw-r-----',
            'owner': 'root'
        },
        '/opt': {'type': 'dir', 'mtime': now - timedelta(days=100), 'perm': 'rwxr-xr-x', 'owner': 'root'},
        '/opt/zk-agent': {'type': 'dir', 'mtime': now - timedelta(days=20), 'perm': 'rwxr-xr-x', 'owner': 'root'},
        '/opt/zk-agent/config.yaml': {
            'type': 'file',
            'content': b'agent:\n  version: 2.4.0\n  datacenter: IST-DC-02\n  cluster: prod-sec-01\n  metrics:\n    enabled: true\n    interval_seconds: 15\n  tls:\n    verify: true\n    ca_path: /etc/ssl/certs/internal-ca.crt\n',
            'mtime': now - timedelta(days=20),
            'perm': 'rw-r--r--',
            'owner': 'root'
        },
        '/tmp': {'type': 'dir', 'mtime': now - timedelta(minutes=10), 'perm': 'rwxrwxrwt', 'owner': 'root'},
    }
    return fs


class MockConnector(DeviceConnector):
    """
    Simulated device connector supporting full virtual filesystem operations,
    dynamic path handling and live system metric generation.
    """

    def __init__(self, device):
        super().__init__(device)
        self.device_id_str = str(device.id)
        self._ensure_fs()

    def _ensure_fs(self):
        """Initializes or retrieves the persistent virtual filesystem for this device."""
        if self.device_id_str not in _MOCK_FILESYSTEMS:
            if self.device.is_windows:
                _MOCK_FILESYSTEMS[self.device_id_str] = _get_initial_windows_fs(self.device)
            else:
                _MOCK_FILESYSTEMS[self.device_id_str] = _get_initial_linux_fs(self.device)
        self._fs = _MOCK_FILESYSTEMS[self.device_id_str]

    def _normalize_path(self, path: Optional[str]) -> str:
        """Normalizes path according to target device OS."""
        if not path:
            return self.get_default_path()

        # Path traversal checks
        if '..' in path.split('/') or '..' in path.split('\\'):
            raise PathTraversalException('Dizin tırmanışı (path traversal) tespit edildi ve engellendi.')

        if self.device.is_windows:
            p = path.replace('/', '\\')
            if not (p.startswith('C:\\') or p == 'C:'):
                p = 'C:\\' + p.lstrip('\\')
            if len(p) > 3 and p.endswith('\\'):
                p = p.rstrip('\\')
            return p
        else:
            p = path.replace('\\', '/')
            if not p.startswith('/'):
                p = '/' + p.lstrip('/')
            p = posixpath.normpath(p)
            return p

    def connect(self) -> bool:
        time.sleep(0.05)  # Simulated fast network latency
        self.is_connected = True
        return True

    def disconnect(self) -> None:
        self.is_connected = False

    def test_connection(self) -> ConnectionResult:
        """Simulates connection test with latency."""
        start = time.time()
        time.sleep(0.08)
        elapsed_ms = (time.time() - start) * 1000

        if not self.device.is_enabled:
            return ConnectionResult(
                success=False,
                status='OFFLINE',
                latency_ms=elapsed_ms,
                message='Cihaz yönetimsel olarak devre dışı bırakılmıştır.',
                error_code='DEVICE_DISABLED'
            )

        return ConnectionResult(
            success=True,
            status='ONLINE',
            latency_ms=elapsed_ms,
            message=f"{self.device.hostname} ({self.device.ip_address}) cihazına başarıyla erişildi.",
            details={'port': self.device.port, 'os': self.device.operating_system}
        )

    def list_directory(self, path: Optional[str] = None) -> List[FileEntry]:
        norm_path = self._normalize_path(path)
        
        # Check if requested directory exists
        if norm_path not in self._fs and norm_path != 'C:\\' and norm_path != '/':
            raise FileNotFoundException(f"Dizin bulunamadı: {norm_path}")

        entries = []
        is_win = self.device.is_windows

        for item_path, item_meta in self._fs.items():
            if item_path == norm_path:
                continue

            if is_win:
                parent = ntpath.dirname(item_path)
                if norm_path == 'C:\\' and (parent == 'C:' or parent == 'C:\\'):
                    name = ntpath.basename(item_path)
                elif parent == norm_path:
                    name = ntpath.basename(item_path)
                else:
                    continue
            else:
                parent = posixpath.dirname(item_path)
                if parent == norm_path or (norm_path == '/' and parent == '/'):
                    name = posixpath.basename(item_path)
                else:
                    continue

            is_dir = item_meta['type'] == 'dir'
            size = len(item_meta.get('content', b'')) if not is_dir else 0
            ext = name.rsplit('.', 1)[-1].lower() if ('.' in name and not is_dir) else ''

            entries.append(FileEntry(
                name=name,
                path=item_path,
                is_dir=is_dir,
                size=size,
                modified_time=item_meta.get('mtime', datetime.now()),
                permissions=item_meta.get('perm', 'rw-r--r--'),
                owner=item_meta.get('owner', self.device.username or 'admin'),
                extension=ext,
                is_hidden=name.startswith('.')
            ))

        # Sort: directories first, then alphabetically
        entries.sort(key=lambda e: (not e.is_dir, e.name.lower()))
        return entries

    def get_file_content(self, path: str, max_bytes: int = 1048576) -> str:
        norm_path = self._normalize_path(path)
        if norm_path not in self._fs:
            raise FileNotFoundException(f"Dosya bulunamadı: {norm_path}")

        meta = self._fs[norm_path]
        if meta['type'] == 'dir':
            raise PermissionDeniedException('Dizin içeriği metin dosyası olarak açılamaz.')

        raw_bytes = meta.get('content', b'')[:max_bytes]
        try:
            return raw_bytes.decode('utf-8')
        except UnicodeDecodeError:
            return raw_bytes.decode('latin-1', errors='replace')

    def save_file_content(self, path: str, content: str) -> None:
        norm_path = self._normalize_path(path)
        if norm_path not in self._fs:
            raise FileNotFoundException(f"Dosya bulunamadı: {norm_path}")

        meta = self._fs[norm_path]
        if meta['type'] == 'dir':
            raise PermissionDeniedException('Dizin üzerine metin yazılamaz.')

        meta['content'] = content.encode('utf-8')
        meta['mtime'] = datetime.now()

    def download_file(self, path: str) -> BinaryIO:
        norm_path = self._normalize_path(path)
        if norm_path not in self._fs:
            raise FileNotFoundException(f"Dosya bulunamadı: {norm_path}")

        meta = self._fs[norm_path]
        if meta['type'] == 'dir':
            raise PermissionDeniedException('Dizinler doğrudan dosya gibi indirilemez.')

        content = meta.get('content', b'')
        return io.BytesIO(content)

    def upload_file(self, path: str, file_obj: BinaryIO, overwrite: bool = False) -> None:
        norm_path = self._normalize_path(path)
        if norm_path in self._fs and not overwrite:
            raise FileAlreadyExistsException(f"Bu dosya zaten mevcut: {norm_path}")

        content = file_obj.read()
        self._fs[norm_path] = {
            'type': 'file',
            'content': content,
            'mtime': datetime.now(),
            'perm': 'rw-r--r--',
            'owner': self.device.username or 'operator'
        }

    def create_directory(self, path: str) -> None:
        norm_path = self._normalize_path(path)
        if norm_path in self._fs:
            raise FileAlreadyExistsException(f"Bu dizin zaten mevcut: {norm_path}")

        self._fs[norm_path] = {
            'type': 'dir',
            'mtime': datetime.now(),
            'perm': 'rwxr-xr-x',
            'owner': self.device.username or 'operator'
        }

    def delete_item(self, path: str) -> None:
        norm_path = self._normalize_path(path)
        if norm_path not in self._fs:
            raise FileNotFoundException(f"Silinecek öğe bulunamadı: {norm_path}")

        # If it's a directory, remove all children recursively
        to_delete = [p for p in self._fs if p == norm_path or p.startswith(norm_path + ('\\' if self.device.is_windows else '/'))]
        for p in to_delete:
            del self._fs[p]

    def rename_item(self, old_path: str, new_name: str) -> str:
        norm_old = self._normalize_path(old_path)
        if norm_old not in self._fs:
            raise FileNotFoundException(f"Öğe bulunamadı: {norm_old}")

        is_win = self.device.is_windows
        sep = '\\' if is_win else '/'
        parent = ntpath.dirname(norm_old) if is_win else posixpath.dirname(norm_old)
        norm_new = f"{parent}{sep}{new_name}" if parent not in ['C:\\', '/'] else f"{parent}{new_name}"

        if norm_new in self._fs:
            raise FileAlreadyExistsException(f"Bu isimde bir öğe zaten mevcut: {new_name}")

        meta = self._fs.pop(norm_old)
        self._fs[norm_new] = meta

        # If directory, rename sub-paths
        sub_prefix = norm_old + sep
        for p in list(self._fs.keys()):
            if p.startswith(sub_prefix):
                child_meta = self._fs.pop(p)
                new_child_path = norm_new + sep + p[len(sub_prefix):]
                self._fs[new_child_path] = child_meta

        return norm_new

    def move_item(self, src_path: str, dst_dir: str) -> None:
        norm_src = self._normalize_path(src_path)
        norm_dst_dir = self._normalize_path(dst_dir)

        if norm_src not in self._fs:
            raise FileNotFoundException(f"Kaynak dosya bulunamadı: {norm_src}")

        is_win = self.device.is_windows
        name = ntpath.basename(norm_src) if is_win else posixpath.basename(norm_src)
        sep = '\\' if is_win else '/'
        norm_dst = f"{norm_dst_dir}{sep}{name}" if norm_dst_dir not in ['C:\\', '/'] else f"{norm_dst_dir}{name}"

        if norm_dst in self._fs:
            raise FileAlreadyExistsException(f"Hedef konumda aynı isimde dosya var: {norm_dst}")

        meta = self._fs.pop(norm_src)
        self._fs[norm_dst] = meta

    def copy_item(self, src_path: str, dst_dir: str) -> None:
        norm_src = self._normalize_path(src_path)
        norm_dst_dir = self._normalize_path(dst_dir)

        if norm_src not in self._fs:
            raise FileNotFoundException(f"Kopyalanacak dosya bulunamadı: {norm_src}")

        is_win = self.device.is_windows
        name = ntpath.basename(norm_src) if is_win else posixpath.basename(norm_src)
        sep = '\\' if is_win else '/'
        norm_dst = f"{norm_dst_dir}{sep}{name}" if norm_dst_dir not in ['C:\\', '/'] else f"{norm_dst_dir}{name}"

        src_meta = self._fs[norm_src]
        self._fs[norm_dst] = {
            'type': src_meta['type'],
            'content': bytes(src_meta.get('content', b'')),
            'mtime': datetime.now(),
            'perm': src_meta.get('perm', 'rw-r--r--'),
            'owner': self.device.username or 'operator'
        }

    def get_file_info(self, path: str) -> FileInfo:
        norm_path = self._normalize_path(path)
        if norm_path not in self._fs:
            raise FileNotFoundException(f"Dosya bilgisi alınamadı, dosya bulunamadı: {norm_path}")

        meta = self._fs[norm_path]
        is_dir = meta['type'] == 'dir'
        is_win = self.device.is_windows
        name = ntpath.basename(norm_path) if is_win else posixpath.basename(norm_path)
        content = meta.get('content', b'')
        size = len(content) if not is_dir else 0

        # Calculate MD5 checksum for files
        checksum = hashlib.md5(content).hexdigest() if not is_dir else None

        # Guess mime type
        ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
        mime_map = {
            'txt': 'text/plain',
            'log': 'text/plain',
            'json': 'application/json',
            'pdf': 'application/pdf',
            'py': 'text/x-python',
            'sh': 'text/x-shellscript',
            'conf': 'text/plain',
            'yaml': 'text/yaml',
            'yml': 'text/yaml',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
        mime = mime_map.get(ext, 'application/octet-stream' if not is_dir else 'inode/directory')

        return FileInfo(
            name=name,
            path=norm_path,
            is_dir=is_dir,
            size=size,
            created_time=meta.get('mtime', datetime.now()) - timedelta(days=1),
            modified_time=meta.get('mtime', datetime.now()),
            accessed_time=datetime.now(),
            permissions=meta.get('perm', 'rw-r--r--'),
            owner=meta.get('owner', self.device.username or 'SYSTEM'),
            mime_type=mime,
            checksum_md5=checksum,
            is_readable=True,
            is_writable=True
        )

    def get_system_info(self) -> SystemInfo:
        """Returns realistic simulated system telemetry."""
        is_win = self.device.is_windows
        return SystemInfo(
            hostname=self.device.hostname,
            operating_system=self.device.get_operating_system_display(),
            os_version=self.device.os_version or ('Windows 11 Enterprise (Build 22631)' if is_win else 'Ubuntu 24.04.1 LTS (Linux 6.8.0-31-generic)'),
            cpu_usage_percent=24.5,
            memory_total_bytes=17179869184,  # 16 GB
            memory_used_bytes=9878424576,   # ~9.2 GB
            memory_usage_percent=57.5,
            disk_total_bytes=512110190592,  # 512 GB
            disk_used_bytes=214748364800,   # ~200 GB
            disk_usage_percent=41.9,
            uptime_seconds=345600,
            uptime_display='4 gün 02 saat 14 dk',
            logged_in_user=self.device.personnel_number or self.device.username or '550047',
            ip_address=self.device.ip_address,
            mac_address=self.device.mac_address or '00:50:56:A1:B2:C3',
            domain=self.device.domain or 'INTERNAL.BANK.CORP'
        )

    def get_path_separator(self) -> str:
        return '\\' if self.device.is_windows else '/'

    def get_default_path(self) -> str:
        user = self.device.personnel_number or '550047'
        if self.device.is_windows:
            return f"C:\\Users\\{user}\\Desktop"
        else:
            return f"/home/{user}"

    def get_root_paths(self) -> List[Dict[str, str]]:
        if self.device.is_windows:
            return [{'name': 'Yerel Disk (C:)', 'path': 'C:\\'}]
        else:
            return [{'name': 'Kök Dizin (/)', 'path': '/'}]

    def execute_command(self, command: str) -> Dict[str, Any]:
        """Simulates command execution on Windows or Linux terminal."""
        cmd = command.strip().lower()
        is_win = self.device.is_windows
        user = self.device.personnel_number or '550047'

        if cmd.startswith('ping'):
            target = command.split()[-1] if len(command.split()) > 1 else '127.0.0.1'
            if is_win:
                output = (
                    f"Pinging {target} with 32 bytes of data:\n"
                    f"Reply from {target}: bytes=32 time=1ms TTL=128\n"
                    f"Reply from {target}: bytes=32 time=2ms TTL=128\n"
                    f"Reply from {target}: bytes=32 time=1ms TTL=128\n"
                    f"Reply from {target}: bytes=32 time=1ms TTL=128\n\n"
                    f"Ping statistics for {target}:\n"
                    f"    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),\n"
                    f"Approximate round trip times in milli-seconds:\n"
                    f"    Minimum = 1ms, Maximum = 2ms, Average = 1ms"
                )
            else:
                output = (
                    f"PING {target} ({target}) 56(84) bytes of data.\n"
                    f"64 bytes from {target}: icmp_seq=1 ttl=64 time=0.421 ms\n"
                    f"64 bytes from {target}: icmp_seq=2 ttl=64 time=0.389 ms\n"
                    f"64 bytes from {target}: icmp_seq=3 ttl=64 time=0.405 ms\n"
                    f"64 bytes from {target}: icmp_seq=4 ttl=64 time=0.392 ms\n\n"
                    f"--- {target} ping statistics ---\n"
                    f"4 packets transmitted, 4 received, 0% packet loss, time 3058ms\n"
                    f"rtt min/avg/max/mdev = 0.389/0.401/0.421/0.012 ms"
                )
            return {'output': output, 'exit_code': 0, 'success': True}

        elif cmd in ['whoami']:
            output = f"INTERNAL\\{user}" if is_win else user
            return {'output': output, 'exit_code': 0, 'success': True}

        elif cmd in ['hostname']:
            return {'output': self.device.hostname, 'exit_code': 0, 'success': True}

        elif cmd in ['ipconfig', 'ifconfig', 'ip a']:
            if is_win:
                output = (
                    "Windows IP Configuration\n\n"
                    "Ethernet adapter vSwitch0:\n"
                    "   Connection-specific DNS Suffix  . : internal.bank.corp\n"
                    f"   IPv4 Address. . . . . . . . . . . : {self.device.ip_address}\n"
                    "   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n"
                    "   Default Gateway . . . . . . . . . : 10.20.15.1"
                )
            else:
                output = (
                    f"eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n"
                    f"        inet {self.device.ip_address}  netmask 255.255.255.0  broadcast 10.20.15.255\n"
                    f"        ether {self.device.mac_address or '00:50:56:b2:c3:d4'}  txqueuelen 1000  (Ethernet)\n"
                    f"        RX packets 291042  bytes 184920194 (184.9 MB)\n"
                    f"        TX packets 149021  bytes 94829102 (94.8 MB)"
                )
            return {'output': output, 'exit_code': 0, 'success': True}

        elif cmd in ['uptime']:
            output = "4 days, 2 hours, 14 minutes, load average: 0.12, 0.08, 0.05"
            return {'output': output, 'exit_code': 0, 'success': True}

        elif cmd.startswith('dir') or cmd.startswith('ls'):
            curr_path = self.get_default_path()
            entries = self.list_directory(curr_path)
            lines = [f"Directory listing of {curr_path}:"]
            for e in entries:
                prefix = "<DIR> " if e.is_dir else f"{e.size:>10} "
                lines.append(f"  {prefix} {e.name}")
            return {'output': "\n".join(lines), 'exit_code': 0, 'success': True}

        else:
            return {
                'output': f"[{self.device.hostname}] Komut basariyla calistirildi: {command}\nDurum: 200 OK (Simule Terminal / Remote Shell)",
                'exit_code': 0,
                'success': True
            }

