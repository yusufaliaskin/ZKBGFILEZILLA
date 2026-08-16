"""
Device and Credential models for ZK Remote Operations Center.
"""

import uuid
import base64
from django.db import models
from django.utils import timezone
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from cryptography.fernet import Fernet


class DeviceOS(models.TextChoices):
    WINDOWS = 'WINDOWS', _('Windows')
    LINUX = 'LINUX', _('Linux')


class DeviceStatus(models.TextChoices):
    ONLINE = 'ONLINE', _('Çevrimiçi')
    OFFLINE = 'OFFLINE', _('Çevrimdışı')
    WARNING = 'WARNING', _('Uyarı')
    UNKNOWN = 'UNKNOWN', _('Bilinmiyor')


class ConnectorType(models.TextChoices):
    WINDOWS_REMOTE = 'WINDOWS_REMOTE', _('Windows Remote Management')
    SSH = 'SSH', _('SSH / SFTP')
    SFTP = 'SFTP', _('SFTP Direct')
    MOCK = 'MOCK', _('Geliştirme / Mock Connector')


def get_fernet_cipher():
    """Generates or loads Fernet cipher from settings."""
    raw_key = getattr(settings, 'ENCRYPTION_KEY', 'xK9vN2_wQ6jR8bL1pY4tV7zE0aC3sM5kH8uI2oF4gA=')
    # Ensure key is valid 32-byte urlsafe base64
    key_bytes = raw_key.encode('utf-8')
    if len(key_bytes) < 32:
        key_bytes = key_bytes.ljust(32, b'=')
    safe_key = base64.urlsafe_b64encode(key_bytes[:32])
    return Fernet(safe_key)


class Device(models.Model):
    """
    Authorized enterprise device managed within ZK Remote Operations Center.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name=_('Cihaz ID')
    )
    personnel_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name=_('Sicil Numarası'),
        help_text=_('Cihazın zimmetli olduğu personel sicil numarası')
    )
    hostname = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name=_('Bilgisayar Adı / Hostname')
    )
    display_name = models.CharField(
        max_length=150,
        blank=True,
        default='',
        verbose_name=_('Görünen İsim')
    )
    operating_system = models.CharField(
        max_length=20,
        choices=DeviceOS.choices,
        default=DeviceOS.WINDOWS,
        verbose_name=_('İşletim Sistemi'),
        db_index=True
    )
    os_version = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name=_('İşletim Sistemi Sürümü')
    )
    ip_address = models.GenericIPAddressField(
        db_index=True,
        verbose_name=_('IP Adresi')
    )
    mac_address = models.CharField(
        max_length=30,
        blank=True,
        default='',
        verbose_name=_('MAC Adresi')
    )
    username = models.CharField(
        max_length=100,
        verbose_name=_('Bağlantı Kullanıcı Adı')
    )
    domain = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name=_('Etki Alanı / Domain')
    )
    connector_type = models.CharField(
        max_length=30,
        choices=ConnectorType.choices,
        default=ConnectorType.SSH,
        verbose_name=_('Bağlantı Türü')
    )
    port = models.PositiveIntegerField(
        default=22,
        verbose_name=_('Bağlantı Portu')
    )
    status = models.CharField(
        max_length=20,
        choices=DeviceStatus.choices,
        default=DeviceStatus.UNKNOWN,
        db_index=True,
        verbose_name=_('Cihaz Durumu')
    )
    last_seen = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name=_('Son Görülme Zamanı')
    )
    description = models.TextField(
        blank=True,
        default='',
        verbose_name=_('Açıklama / Notlar')
    )
    is_enabled = models.BooleanField(
        default=True,
        verbose_name=_('Aktif mi?')
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Kayıt Tarihi')
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Son Güncelleme')
    )

    class Meta:
        verbose_name = _('Yetkili Cihaz')
        verbose_name_plural = _('Yetkili Cihazlar')
        ordering = ['hostname', 'personnel_number']
        indexes = [
            models.Index(fields=['personnel_number', 'hostname']),
            models.Index(fields=['status', 'operating_system']),
        ]

    def __str__(self):
        return f"{self.hostname} ({self.personnel_number}) - {self.get_operating_system_display()}"

    def save(self, *args, **kwargs):
        if not self.display_name:
            self.display_name = f"{self.hostname} ({self.personnel_number})"
        if not self.port:
            self.port = 22 if self.operating_system == DeviceOS.LINUX else 5985
        super().save(*args, **kwargs)

    @property
    def is_online(self) -> bool:
        return self.status == DeviceStatus.ONLINE

    @property
    def is_windows(self) -> bool:
        return self.operating_system == DeviceOS.WINDOWS

    @property
    def is_linux(self) -> bool:
        return self.operating_system == DeviceOS.LINUX


class CredentialType(models.TextChoices):
    PASSWORD = 'PASSWORD', _('Parola')
    SSH_KEY = 'SSH_KEY', _('SSH Özel Anahtarı')
    TOKEN = 'TOKEN', _('Kimlik Doğrulama Belirteci')


class DeviceCredential(models.Model):
    """
    Encrypted credential storage for remote device management.
    Never exposes raw secrets via API or string representation.
    """
    device = models.OneToOneField(
        Device,
        on_delete=models.CASCADE,
        related_name='credential',
        verbose_name=_('Cihaz')
    )
    credential_type = models.CharField(
        max_length=20,
        choices=CredentialType.choices,
        default=CredentialType.PASSWORD,
        verbose_name=_('Kimlik Bilgisi Türü')
    )
    _encrypted_secret = models.TextField(
        db_column='encrypted_secret',
        blank=True,
        default='',
        verbose_name=_('Şifrelenmiş Parola/Anahtar')
    )
    ssh_key_path = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name=_('SSH Anahtar Dosya Yolu')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Cihaz Kimlik Bilgisi')
        verbose_name_plural = _('Cihaz Kimlik Bilgileri')

    def __str__(self):
        return f"Credentials for {self.device.hostname} ({self.get_credential_type_display()})"

    def set_secret(self, raw_secret: str):
        """Encrypts and stores raw secret value."""
        if not raw_secret:
            self._encrypted_secret = ''
            return
        cipher = get_fernet_cipher()
        encrypted = cipher.encrypt(raw_secret.encode('utf-8'))
        self._encrypted_secret = encrypted.decode('utf-8')

    def get_secret(self) -> str:
        """Decrypts and returns raw secret for connector use only."""
        if not self._encrypted_secret:
            return ''
        try:
            cipher = get_fernet_cipher()
            decrypted = cipher.decrypt(self._encrypted_secret.encode('utf-8'))
            return decrypted.decode('utf-8')
        except Exception:
            return ''


class SyncSchedule(models.TextChoices):
    HOURLY = 'HOURLY', _('Her Saat Başı')
    DAILY = 'DAILY', _('Her Gün (Gece 02:00)')
    WEEKLY = 'WEEKLY', _('Haftalık (Pazar 03:00)')
    MANUAL = 'MANUAL', _('Manuel Tetikleme')


class SyncJob(models.Model):
    """
    Automated SFTP / Backup Synchronization Job.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, verbose_name=_('Görev Adı'))
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='sync_jobs', verbose_name=_('Hedef Düğüm'))
    remote_path = models.CharField(max_length=255, default='/var/log', verbose_name=_('Uzak Sunucu Yolu'))
    local_destination = models.CharField(max_length=255, default='/backups', verbose_name=_('Yerel Yedekleme Dizini'))
    schedule = models.CharField(max_length=20, choices=SyncSchedule.choices, default=SyncSchedule.DAILY, verbose_name=_('Zamanlama'))
    is_active = models.BooleanField(default=True, verbose_name=_('Aktif mi?'))
    last_run_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Son Çalışma Zamanı'))
    last_status = models.CharField(max_length=20, default='PENDING', verbose_name=_('Son Durum'))
    last_log = models.TextField(blank=True, default='', verbose_name=_('Son Çalışma Günlüğü'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Yedekleme & Eşitleme Görevi')
        verbose_name_plural = _('Yedekleme & Eşitleme Görevleri')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.device.hostname})"

