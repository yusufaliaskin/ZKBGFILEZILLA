"""
User and Role models for ZK Remote Operations Center.
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _


class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', _('Sistem Yöneticisi (Admin)')
    OPERATOR = 'OPERATOR', _('Operatör')
    READ_ONLY = 'READ_ONLY', _('Salt Okunur (Read Only)')
    AUDITOR = 'AUDITOR', _('Denetçi (Auditor)')


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name=_('Departman Adı'))
    code = models.CharField(max_length=20, blank=True, default='', verbose_name=_('Departman Kodu'))
    description = models.TextField(blank=True, default='', verbose_name=_('Açıklama'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Oluşturulma Tarihi'))

    class Meta:
        verbose_name = _('Departman')
        verbose_name_plural = _('Departmanlar')
        ordering = ['name']

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    """
    Profile extension for Django User containing RBAC role,
    personnel number, department and UI preferences.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name=_('Kullanıcı')
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.OPERATOR,
        verbose_name=_('Kullanıcı Rolü'),
        db_index=True
    )
    personnel_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        unique=True,
        verbose_name=_('Sicil Numarası'),
        db_index=True
    )
    department = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name=_('Departman / Birim')
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name=_('Dahili / Telefon')
    )
    theme_preference = models.CharField(
        max_length=10,
        choices=[('light', 'Açık Tema'), ('dark', 'Koyu Tema')],
        default='light',
        verbose_name=_('Tema Tercihi')
    )
    last_activity = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Son Aktivite Zamanı')
    )
    last_login_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_('Son Giriş IP')
    )

    class Meta:
        verbose_name = _('Kullanıcı Profili')
        verbose_name_plural = _('Kullanıcı Profilleri')
        ordering = ['-user__date_joined']

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.get_role_display()})"

    # RBAC Permission Helpers
    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN or self.user.is_superuser

    @property
    def is_operator(self) -> bool:
        return self.role in [UserRole.ADMIN, UserRole.OPERATOR] or self.user.is_superuser

    @property
    def is_auditor(self) -> bool:
        return self.role in [UserRole.ADMIN, UserRole.AUDITOR] or self.user.is_superuser

    @property
    def is_readonly(self) -> bool:
        return self.role == UserRole.READ_ONLY

    @property
    def can_manage_devices(self) -> bool:
        return self.is_admin

    @property
    def can_manage_files(self) -> bool:
        """Can create, edit, rename, move, delete files."""
        return self.is_operator

    @property
    def can_download_files(self) -> bool:
        return self.is_operator or self.is_admin

    @property
    def can_view_files(self) -> bool:
        return True  # All authenticated roles can list and preview allowed files

    @property
    def can_use_terminal(self) -> bool:
        """Terminal access requires explicit ADMIN permission."""
        return self.is_admin

    @property
    def can_view_audit_logs(self) -> bool:
        return self.is_admin or self.is_auditor
