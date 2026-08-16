from rest_framework import serializers
from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    operation_display = serializers.CharField(source='get_operation_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    device_hostname = serializers.CharField(source='hostname', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'timestamp', 'username', 'user_role',
            'personnel_number', 'hostname', 'device_hostname',
            'operation', 'operation_display', 'path',
            'status', 'status_display', 'ip_address', 'metadata'
        ]
        read_only_fields = fields
