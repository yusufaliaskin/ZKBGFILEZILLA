"""
Custom DRF permissions enforcing RBAC for ZK Remote Operations Center.
"""

from rest_framework import permissions
from .models import UserRole


class IsAdminUser(permissions.BasePermission):
    """Allows access only to users with ADMIN role or superusers."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'profile') and request.user.profile.is_admin


class IsOperatorUser(permissions.BasePermission):
    """Allows access to ADMIN and OPERATOR roles."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'profile') and request.user.profile.is_operator


class CanManageDevices(permissions.BasePermission):
    """Allows read access to all roles, write access only to ADMIN."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return hasattr(request.user, 'profile') and request.user.profile.can_manage_devices


class CanManageFiles(permissions.BasePermission):
    """
    Read (GET/HEAD/OPTIONS): All authenticated users.
    Write (POST/PUT/PATCH/DELETE): ADMIN and OPERATOR only.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return hasattr(request.user, 'profile') and request.user.profile.can_manage_files


class CanViewAuditLogs(permissions.BasePermission):
    """Allows access only to ADMIN and AUDITOR roles."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'profile') and request.user.profile.can_view_audit_logs


class CanAccessTerminal(permissions.BasePermission):
    """Strictly requires ADMIN role."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'profile') and request.user.profile.can_use_terminal
