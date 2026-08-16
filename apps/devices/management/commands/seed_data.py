"""
Database seeding command for ZK Remote Operations Center.
Initializes test users, roles, authorized devices, and sample audit records.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from apps.accounts.models import UserProfile, UserRole
from apps.devices.models import Device, DeviceOS, DeviceStatus, ConnectorType, DeviceCredential
from apps.audit.models import AuditLog, AuditOperation, AuditStatus


class Command(BaseCommand):
    help = 'Tohum verileri (kullanıcılar, roller, örnek cihazlar ve audit kayıtları) oluşturur.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Tohum veriler oluşturuluyor...'))

        # 1. Create Users
        users_data = [
            {
                'username': 'admin',
                'password': 'admin123',
                'first_name': 'Sistem',
                'last_name': 'Yöneticisi',
                'is_superuser': True,
                'is_staff': True,
                'role': UserRole.ADMIN,
                'personnel_number': 'ZK00001',
                'department': 'Siber Güvenlik & Operasyon Merkezi',
            },
            {
                'username': 'operator',
                'password': 'operator123',
                'first_name': 'Ahmet',
                'last_name': 'Yılmaz',
                'is_superuser': False,
                'is_staff': False,
                'role': UserRole.OPERATOR,
                'personnel_number': 'ZK00042',
                'department': 'Sistem Yönetimi & Destek',
            },
            {
                'username': 'auditor',
                'password': 'auditor123',
                'first_name': 'Elif',
                'last_name': 'Kaya',
                'is_superuser': False,
                'is_staff': False,
                'role': UserRole.AUDITOR,
                'personnel_number': 'ZK00088',
                'department': 'İç Denetim ve Uyum Başkanlığı',
            },
        ]

        for udata in users_data:
            user, created = User.objects.get_or_create(
                username=udata['username'],
                defaults={
                    'first_name': udata['first_name'],
                    'last_name': udata['last_name'],
                    'is_superuser': udata['is_superuser'],
                    'is_staff': udata['is_staff'],
                }
            )
            user.set_password(udata['password'])
            user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = udata['role']
            profile.personnel_number = udata['personnel_number']
            profile.department = udata['department']
            profile.theme_preference = 'light'
            profile.save()

            status_str = 'Oluşturuldu' if created else 'Güncellendi'
            self.stdout.write(f" - Kullanıcı [{user.username}] ({udata['role']}) -> {status_str}")

        # 2. Create Sample Authorized Devices
        devices_data = [
            {
                'personnel_number': '550047',
                'hostname': 'ZK34990NX0814',
                'display_name': 'Finansal Analiz İstasyonu 01',
                'operating_system': DeviceOS.WINDOWS,
                'os_version': 'Windows 11 Enterprise (23H2)',
                'ip_address': '10.20.15.42',
                'mac_address': '00:50:56:A1:B2:C3',
                'username': '550047',
                'domain': 'INTERNAL.BANK.CORP',
                'connector_type': ConnectorType.WINDOWS_REMOTE,
                'port': 5985,
                'status': DeviceStatus.ONLINE,
                'last_seen': timezone.now(),
                'description': 'Genel Müdürlük Hazine ve Finansal Operasyonlar çalışma istasyonu.',
            },
            {
                'personnel_number': '550081',
                'hostname': 'ZK34990NX0921',
                'display_name': 'Altyapı & Otomasyon Sunucusu',
                'operating_system': DeviceOS.LINUX,
                'os_version': 'Ubuntu 24.04.1 LTS',
                'ip_address': '10.20.15.88',
                'mac_address': '00:50:56:B2:C3:D4',
                'username': '550081',
                'domain': 'INTERNAL.BANK.CORP',
                'connector_type': ConnectorType.SSH,
                'port': 22,
                'status': DeviceStatus.ONLINE,
                'last_seen': timezone.now(),
                'description': 'Orchestration ve backend servis yönetim düğümü.',
            },
            {
                'personnel_number': '550102',
                'hostname': 'ZK34990NX1044',
                'display_name': 'Krediler Operasyon Terminali',
                'operating_system': DeviceOS.WINDOWS,
                'os_version': 'Windows 11 Pro',
                'ip_address': '10.20.16.14',
                'mac_address': '00:50:56:C3:D4:E5',
                'username': '550102',
                'domain': 'INTERNAL.BANK.CORP',
                'connector_type': ConnectorType.WINDOWS_REMOTE,
                'port': 5985,
                'status': DeviceStatus.WARNING,
                'last_seen': timezone.now() - timezone.timedelta(hours=4),
                'description': 'Krediler ve tahsis birimi uç nokta bilgisayarı.',
            },
            {
                'personnel_number': '550019',
                'hostname': 'ZK34990NX0712',
                'display_name': 'Yedekleme & Arşiv Düğümü',
                'operating_system': DeviceOS.LINUX,
                'os_version': 'Red Hat Enterprise Linux 9.3',
                'ip_address': '10.20.18.50',
                'mac_address': '00:50:56:D4:E5:F6',
                'username': '550019',
                'domain': 'INTERNAL.BANK.CORP',
                'connector_type': ConnectorType.SSH,
                'port': 22,
                'status': DeviceStatus.OFFLINE,
                'last_seen': timezone.now() - timezone.timedelta(days=2),
                'description': 'Veri merkezi ikincil arşivleme sunucusu.',
            },
        ]

        for ddata in devices_data:
            device, created = Device.objects.get_or_create(
                personnel_number=ddata['personnel_number'],
                defaults=ddata
            )
            if not created:
                for k, v in ddata.items():
                    setattr(device, k, v)
                device.save()

            cred, _ = DeviceCredential.objects.get_or_create(
                device=device,
                defaults={'credential_type': 'PASSWORD'}
            )
            cred.set_secret('dummy_secure_token_for_dev')
            cred.save()

            status_str = 'Oluşturuldu' if created else 'Güncellendi'
            self.stdout.write(f" - Cihaz [{device.hostname}] ({device.personnel_number}) -> {status_str}")

        # 3. Create Sample Audit Log Records
        sample_logs = [
            {
                'username': 'admin',
                'user_role': 'ADMIN',
                'hostname': 'ZK34990NX0814',
                'personnel_number': '550047',
                'operation': AuditOperation.DEVICE_CONNECT_TEST,
                'path': '10.20.15.42:5985',
                'status': AuditStatus.SUCCESS,
                'ip_address': '127.0.0.1',
            },
            {
                'username': 'operator',
                'user_role': 'OPERATOR',
                'hostname': 'ZK34990NX0814',
                'personnel_number': '550047',
                'operation': AuditOperation.DOWNLOAD,
                'path': 'C:\\Users\\550047\\Desktop\\Financial_Report_Q3.pdf',
                'status': AuditStatus.SUCCESS,
                'ip_address': '127.0.0.1',
            },
            {
                'username': 'operator',
                'user_role': 'OPERATOR',
                'hostname': 'ZK34990NX0921',
                'personnel_number': '550081',
                'operation': AuditOperation.PREVIEW_FILE,
                'path': '/etc/nginx/nginx.conf',
                'status': AuditStatus.SUCCESS,
                'ip_address': '127.0.0.1',
            },
            {
                'username': 'operator',
                'user_role': 'OPERATOR',
                'hostname': 'ZK34990NX0921',
                'personnel_number': '550081',
                'operation': AuditOperation.LIST_DIR,
                'path': '/home/550081/scripts',
                'status': AuditStatus.SUCCESS,
                'ip_address': '127.0.0.1',
            },
        ]

        for ldata in sample_logs:
            AuditLog.objects.create(**ldata)

        self.stdout.write(self.style.SUCCESS('Tüm tohum verileri başarıyla yüklendi!'))
