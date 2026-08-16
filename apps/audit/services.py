"""
Audit Logging Service for ZK Remote Operations Center.
Centralized method to safely record audit events without blocking primary request flows.
"""

import logging
from typing import Optional, Dict, Any
from apps.audit.models import AuditLog

logger = logging.getLogger('audit')


def log_audit_event(
    user=None,
    operation: str = 'UNKNOWN',
    device=None,
    path: str = '',
    status: str = 'SUCCESS',
    ip_address: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[AuditLog]:
    """
    Creates an immutable audit log record.
    """
    try:
        username = ''
        user_role = ''
        if user and user.is_authenticated:
            username = user.username
            profile = getattr(user, 'profile', None)
            if profile:
                user_role = profile.role

        personnel_number = ''
        hostname = ''
        if device:
            personnel_number = getattr(device, 'personnel_number', '')
            hostname = getattr(device, 'hostname', '')

        return AuditLog.objects.create(
            user=user if user and user.is_authenticated else None,
            username=username or 'ANONYMOUS',
            user_role=user_role,
            device=device,
            personnel_number=personnel_number,
            hostname=hostname,
            operation=operation,
            path=path[:1000] if path else '',
            status=status,
            ip_address=ip_address,
            metadata=metadata or {}
        )
    except Exception as e:
        logger.error(f"Audit log kaydedilirken hata oluştu: {str(e)}")
        return None
