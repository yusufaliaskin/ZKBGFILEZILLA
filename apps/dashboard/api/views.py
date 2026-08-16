from rest_framework import views, permissions
from rest_framework.response import Response
from apps.devices.models import Device, DeviceStatus, DeviceOS
from apps.audit.models import AuditLog
from apps.audit.api.serializers import AuditLogSerializer
from apps.devices.api.serializers import DeviceListSerializer


class DashboardStatsAPIView(views.APIView):
    """
    GET: Operational summary statistics for the dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total_devices = Device.objects.count()
        online_devices = Device.objects.filter(status=DeviceStatus.ONLINE).count()
        offline_devices = Device.objects.filter(status=DeviceStatus.OFFLINE).count()
        warning_devices = Device.objects.filter(status=DeviceStatus.WARNING).count()
        
        windows_count = Device.objects.filter(operating_system=DeviceOS.WINDOWS).count()
        linux_count = Device.objects.filter(operating_system=DeviceOS.LINUX).count()

        recent_logs = AuditLog.objects.select_related('device', 'user').order_by('-timestamp')[:10]
        recent_devices = Device.objects.order_by('-last_seen')[:5]

        return Response({
            'stats': {
                'total_devices': total_devices,
                'online_devices': online_devices,
                'offline_devices': offline_devices,
                'warning_devices': warning_devices,
                'windows_count': windows_count,
                'linux_count': linux_count,
                'active_transfers': 0,
            },
            'recent_activities': AuditLogSerializer(recent_logs, many=True).data,
            'recent_devices': DeviceListSerializer(recent_devices, many=True).data,
        })


class DashboardActivityAPIView(views.APIView):
    """
    GET: Dynamic activity graph data bucketed by time range (1h, 6h, 12h, 24h, 7d, 30d, custom).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta, datetime

        time_range = request.query_params.get('range', '24h').lower()
        now = timezone.localtime(timezone.now())

        labels = []
        counts = []

        if time_range == '1h':
            # 6 buckets of 10 minutes (in local time)
            for i in range(6, 0, -1):
                start = now - timedelta(minutes=i * 10)
                end = now - timedelta(minutes=(i - 1) * 10)
                labels.append(timezone.localtime(start).strftime('%H:%M'))
                counts.append(AuditLog.objects.filter(timestamp__gte=start, timestamp__lt=end).count())

        elif time_range == '6h':
            # 6 buckets of 1 hour (in local time)
            for i in range(6, 0, -1):
                start = now - timedelta(hours=i)
                end = now - timedelta(hours=i - 1)
                labels.append(timezone.localtime(start).strftime('%H:%M'))
                counts.append(AuditLog.objects.filter(timestamp__gte=start, timestamp__lt=end).count())

        elif time_range == '12h':
            # 6 buckets of 2 hours (in local time)
            for i in range(6, 0, -1):
                start = now - timedelta(hours=i * 2)
                end = now - timedelta(hours=(i - 1) * 2)
                labels.append(timezone.localtime(start).strftime('%H:%M'))
                counts.append(AuditLog.objects.filter(timestamp__gte=start, timestamp__lt=end).count())

        elif time_range == '7d':
            # 7 daily buckets (in local time)
            for i in range(7, 0, -1):
                start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
                end = start + timedelta(days=1)
                labels.append(timezone.localtime(start).strftime('%d.%m'))
                counts.append(AuditLog.objects.filter(timestamp__gte=start, timestamp__lt=end).count())

        elif time_range == '30d':
            # 6 buckets of 5 days (in local time)
            for i in range(6, 0, -1):
                start = (now - timedelta(days=i * 5)).replace(hour=0, minute=0, second=0, microsecond=0)
                end = start + timedelta(days=5)
                labels.append(timezone.localtime(start).strftime('%d.%m'))
                counts.append(AuditLog.objects.filter(timestamp__gte=start, timestamp__lt=end).count())

        elif time_range == 'custom':
            start_str = request.query_params.get('start_date', '')
            end_str = request.query_params.get('end_date', '')
            try:
                start_dt = timezone.make_aware(datetime.strptime(start_str, '%Y-%m-%d')) if start_str else now - timedelta(days=7)
                end_dt = timezone.make_aware(datetime.strptime(end_str, '%Y-%m-%d')) if end_str else now
                if end_dt < start_dt:
                    start_dt, end_dt = end_dt, start_dt
                end_dt = end_dt.replace(hour=23, minute=59, second=59)

                delta_days = (end_dt - start_dt).days + 1
                if delta_days <= 2:
                    hours = int((end_dt - start_dt).total_seconds() // 3600) + 1
                    step = max(1, hours // 8)
                    for h in range(0, hours, step):
                        b_start = start_dt + timedelta(hours=h)
                        b_end = min(end_dt, b_start + timedelta(hours=step))
                        labels.append(timezone.localtime(b_start).strftime('%d.%m %H:%M'))
                        counts.append(AuditLog.objects.filter(timestamp__gte=b_start, timestamp__lt=b_end).count())
                else:
                    step = max(1, delta_days // 10)
                    for d in range(0, delta_days, step):
                        b_start = start_dt + timedelta(days=d)
                        b_end = min(end_dt, b_start + timedelta(days=step))
                        labels.append(timezone.localtime(b_start).strftime('%d.%m'))
                        counts.append(AuditLog.objects.filter(timestamp__gte=b_start, timestamp__lt=b_end).count())
            except Exception:
                for i in range(7, 0, -1):
                    start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
                    end = start + timedelta(days=1)
                    labels.append(timezone.localtime(start).strftime('%d.%m'))
                    counts.append(AuditLog.objects.filter(timestamp__gte=start, timestamp__lt=end).count())

        else: # 24h default
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            time_slots = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00',
                          '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
            for i, slot_name in enumerate(time_slots):
                start = today_start + timedelta(hours=i * 2)
                end = start + timedelta(hours=2)
                labels.append(slot_name)
                counts.append(AuditLog.objects.filter(timestamp__gte=start, timestamp__lt=end).count())

        return Response({
            'range': time_range,
            'labels': labels,
            'counts': counts,
            'total': sum(counts)
        })


class DashboardDistributionAPIView(views.APIView):
    """
    GET: Node status distribution dynamically computed for time range (all, 24h, 7d, 30d).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta

        time_range = request.query_params.get('range', 'all').lower()
        now = timezone.now()

        qs = Device.objects.all()
        if time_range == '24h':
            cutoff = now - timedelta(hours=24)
            active_ids = AuditLog.objects.filter(timestamp__gte=cutoff, device__isnull=False).values_list('device_id', flat=True).distinct()
            online_count = qs.filter(id__in=active_ids, status=DeviceStatus.ONLINE).count()
            warning_count = qs.filter(id__in=active_ids, status=DeviceStatus.WARNING).count()
            offline_count = qs.exclude(id__in=active_ids).count() + qs.filter(id__in=active_ids, status=DeviceStatus.OFFLINE).count()
        elif time_range == '7d':
            cutoff = now - timedelta(days=7)
            active_ids = AuditLog.objects.filter(timestamp__gte=cutoff, device__isnull=False).values_list('device_id', flat=True).distinct()
            online_count = qs.filter(id__in=active_ids, status=DeviceStatus.ONLINE).count()
            warning_count = qs.filter(id__in=active_ids, status=DeviceStatus.WARNING).count()
            offline_count = qs.exclude(id__in=active_ids).count() + qs.filter(id__in=active_ids, status=DeviceStatus.OFFLINE).count()
        elif time_range == '30d':
            cutoff = now - timedelta(days=30)
            active_ids = AuditLog.objects.filter(timestamp__gte=cutoff, device__isnull=False).values_list('device_id', flat=True).distinct()
            online_count = qs.filter(id__in=active_ids, status=DeviceStatus.ONLINE).count()
            warning_count = qs.filter(id__in=active_ids, status=DeviceStatus.WARNING).count()
            offline_count = qs.exclude(id__in=active_ids).count() + qs.filter(id__in=active_ids, status=DeviceStatus.OFFLINE).count()
        else:
            online_count = qs.filter(status=DeviceStatus.ONLINE).count()
            warning_count = qs.filter(status=DeviceStatus.WARNING).count()
            offline_count = qs.filter(status=DeviceStatus.OFFLINE).count()

        total = online_count + warning_count + offline_count
        return Response({
            'range': time_range,
            'online': online_count,
            'warning': warning_count,
            'offline': offline_count,
            'total': total
        })


