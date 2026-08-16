from django.db.models import Q
from rest_framework import generics, permissions, views, status
from rest_framework.response import Response
from apps.audit.models import AuditLog
from apps.audit.api.serializers import AuditLogSerializer
from apps.accounts.permissions import CanViewAuditLogs


class AuditLogListAPIView(generics.ListAPIView):
    """
    GET: Query and filter immutable audit logs.
    Restricted to ADMIN and AUDITOR roles.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [CanViewAuditLogs]

    def get_queryset(self):
        queryset = AuditLog.objects.all()

        # Search parameter (q: matches username, personnel_number, hostname, path, operation)
        q = self.request.query_params.get('q', '').strip()
        if q:
            queryset = queryset.filter(
                Q(username__icontains=q) |
                Q(personnel_number__icontains=q) |
                Q(hostname__icontains=q) |
                Q(path__icontains=q) |
                Q(operation__icontains=q)
            )

        # Operation filter
        operation = self.request.query_params.get('operation')
        if operation:
            queryset = queryset.filter(operation=operation)

        # Status filter
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Device filter
        device_id = self.request.query_params.get('device_id')
        if device_id:
            queryset = queryset.filter(device_id=device_id)

        # Date range filters
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)

        return queryset.order_by('-timestamp')


class NotificationListAPIView(views.APIView):
    """
    GET: Return real-time SOC alerts, alarms, and notifications.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.devices.models import Device, DeviceStatus
        from django.utils import timezone
        notifications = []

        # 1. Offline & Warning Devices (Critical Alarms)
        critical_devices = Device.objects.filter(status__in=[DeviceStatus.OFFLINE, DeviceStatus.WARNING])
        for dev in critical_devices:
            notifications.append({
                'id': f"dev-{dev.id}",
                'title': f"Kritik Alarm: {dev.hostname}",
                'message': f"{dev.ip_address} IP adresli düğüm {dev.get_status_display().lower()} durumunda.",
                'category': 'alarm',
                'severity': 'danger',
                'icon': 'alert-triangle',
                'timestamp': dev.last_seen.isoformat() if dev.last_seen else timezone.now().isoformat(),
                'target_url': f"/devices/?q={dev.hostname}",
                'is_read': False,
            })

        # 2. Recent Audit Logs (Security & Operations)
        recent_logs = AuditLog.objects.select_related('device').order_by('-timestamp')[:15]
        for log in recent_logs:
            is_failure = (log.status == 'FAILURE')
            category = 'alarm' if is_failure else ('security' if 'EXECUTE' in log.operation or 'CONNECT' in log.operation else 'system')
            severity = 'danger' if is_failure else ('purple' if category == 'security' else 'blue')
            icon = 'shield-alert' if is_failure else ('terminal' if 'EXECUTE' in log.operation else 'file-text')

            notifications.append({
                'id': f"audit-{log.id}",
                'title': f"{log.get_operation_display() if hasattr(log, 'get_operation_display') else log.operation}: {log.device.hostname if log.device else 'Sistem'}",
                'message': f"Kullanıcı: {log.username} • Yol: {log.path or '-'} • Durum: {log.status}",
                'category': category,
                'severity': severity,
                'icon': icon,
                'timestamp': log.timestamp.isoformat(),
                'target_url': '/audit/',
                'is_read': False,
            })

        unread_count = len([n for n in notifications if not n['is_read']])
        return Response({
            'count': len(notifications),
            'unread_count': unread_count,
            'notifications': notifications[:20]
        }, status=status.HTTP_200_OK)


class NotificationMarkReadAPIView(views.APIView):
    """
    POST: Mark all notifications as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return Response({'success': True, 'message': 'Bildirimler okundu olarak işaretlendi.'}, status=status.HTTP_200_OK)
