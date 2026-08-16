"""
Audit Log models for ZK Remote Operations Center.
Maintains tamper-evident immutable logs of all administrative and file operations.
"""

import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from apps.devices.models import Device


class AuditOperation(models.TextChoices):
    # Authentication
    LOGIN = 'LOGIN', _('Kullanıcı Girişi')
    LOGOUT = 'LOGOUT', _('Kullanıcı Çıkışı')
    
    # Device operations
    DEVICE_REGISTER = 'DEVICE_REGISTER', _('Cihaz Kaydı')
    DEVICE_UPDATE = 'DEVICE_UPDATE', _('Cihaz Güncelleme')
    DEVICE_DELETE = 'DEVICE_DELETE', _('Cihaz Silme')
    DEVICE_CONNECT_TEST = 'DEVICE_CONNECT_TEST', _('Bağlantı Testi')
    
    # File operations
    LIST_DIR = 'LIST_DIR', _('Dizin Listeleme')
    DOWNLOAD = 'DOWNLOAD', _('Dosya İndirme')
    UPLOAD = 'UPLOAD', _('Dosya Yükleme')
    DELETE_FILE = 'DELETE_FILE', _('Dosya/Dizin Silme')
    RENAME_FILE = 'RENAME_FILE', _('Yeniden Adlandırma')
    MOVE_FILE = 'MOVE_FILE', _('Dosya Taşıma')
    COPY_FILE = 'COPY_FILE', _('Dosya Kopyalama')
    MKDIR = 'MKDIR', _('Klasör Oluşturma')
    PREVIEW_FILE = 'PREVIEW_FILE', _('Dosya Önizleme')
    SAVE_FILE = 'SAVE_FILE', _('Dosya Düzenleme/Kaydetme')
    
    # Transfers
    TRANSFER_START = 'TRANSFER_START', _('Transfer Başlatıldı')
    TRANSFER_COMPLETE = 'TRANSFER_COMPLETE', _('Transfer Tamamlandı')
    TRANSFER_FAIL = 'TRANSFER_FAIL', _('Transfer Başarısız')
    
    # Terminal
    TERMINAL_SESSION = 'TERMINAL_SESSION', _('Terminal Oturumu')
    TERMINAL_COMMAND = 'TERMINAL_COMMAND', _('Terminal Komutu')


class AuditStatus(models.TextChoices):
    SUCCESS = 'SUCCESS', _('Başarılı')
    FAILURE = 'FAILURE', _('Başarısız')
    DENIED = 'DENIED', _('Yetkisiz / Reddedildi')


class AuditLog(models.Model):
    """
    Immutable audit record for compliance and security forensics.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name=_('Zaman Damgası')
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name=_('Kullanıcı')
    )
    username = models.CharField(
        max_length=150,
        blank=True,
        default='',
        verbose_name=_('Kullanıcı Adı')
    )
    user_role = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name=_('Kullanıcı Rolü')
    )
    device = models.ForeignKey(
        Device,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name=_('İlgili Cihaz')
    )
    personnel_number = models.CharField(
        max_length=50,
        blank=True,
        default='',
        db_index=True,
        verbose_name=_('Sicil Numarası')
    )
    hostname = models.CharField(
        max_length=100,
        blank=True,
        default='',
        db_index=True,
        verbose_name=_('Cihaz Hostname')
    )
    operation = models.CharField(
        max_length=50,
        choices=AuditOperation.choices,
        db_index=True,
        verbose_name=_('İşlem Türü')
    )
    path = models.CharField(
        max_length=1000,
        blank=True,
        default='',
        verbose_name=_('Dosya / Kaynak Yolu')
    )
    status = models.CharField(
        max_length=20,
        choices=AuditStatus.choices,
        default=AuditStatus.SUCCESS,
        db_index=True,
        verbose_name=_('İşlem Durumu')
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_('İstemci IP Adresi')
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_('Ek Güvenlik / Detay Bilgisi')
    )

    class Meta:
        verbose_name = _('Denetim Kaydı')
        verbose_name_plural = _('Denetim Kayıtları')
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp', 'operation']),
            models.Index(fields=['personnel_number', 'operation']),
            models.Index(fields=['status', 'operation']),
        ]

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M:%S}] {self.username} -> {self.operation} ({self.status})"
