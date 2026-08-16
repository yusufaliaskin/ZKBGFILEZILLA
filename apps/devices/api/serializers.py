from rest_framework import serializers
from apps.devices.models import Device, DeviceCredential, DeviceOS, DeviceStatus, ConnectorType, CredentialType


class DeviceCredentialSerializer(serializers.ModelSerializer):
    secret = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = DeviceCredential
        fields = ['credential_type', 'ssh_key_path', 'secret']


class DeviceListSerializer(serializers.ModelSerializer):
    os_display = serializers.CharField(source='get_operating_system_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Device
        fields = [
            'id', 'personnel_number', 'hostname', 'display_name',
            'operating_system', 'os_display', 'os_version',
            'ip_address', 'username', 'domain', 'connector_type',
            'port', 'status', 'status_display', 'last_seen', 'is_enabled'
        ]


class DeviceDetailSerializer(serializers.ModelSerializer):
    os_display = serializers.CharField(source='get_operating_system_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    personnel_number = serializers.CharField(required=False, allow_blank=True, default='', validators=[])
    hostname = serializers.CharField(required=False, allow_blank=True, default='')
    credential = DeviceCredentialSerializer(required=False, write_only=True)
    has_credential = serializers.SerializerMethodField()

    class Meta:
        model = Device
        fields = [
            'id', 'personnel_number', 'hostname', 'display_name',
            'operating_system', 'os_display', 'os_version',
            'ip_address', 'mac_address', 'username', 'domain',
            'connector_type', 'port', 'status', 'status_display',
            'last_seen', 'description', 'is_enabled',
            'created_at', 'updated_at', 'credential', 'has_credential'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_has_credential(self, obj) -> bool:
        return hasattr(obj, 'credential')

    def create(self, validated_data):
        import time, random
        credential_data = validated_data.pop('credential', None)

        # 1. Ensure personnel_number uniqueness
        p_num = (validated_data.get('personnel_number') or '').strip()
        if not p_num:
            base_p = (validated_data.get('username') or 'NODE').upper()
            p_num = f"{base_p}-{random.randint(1000, 9999)}"

        # If already exists, randomize suffix to guarantee uniqueness
        while Device.objects.filter(personnel_number=p_num).exists():
            p_num = f"{p_num.split('-')[0]}-{random.randint(10000, 99999)}"
        validated_data['personnel_number'] = p_num

        # 2. Defaults for OS, port, connector_type, hostname, display_name
        os_type = validated_data.get('operating_system', 'LINUX')
        if not validated_data.get('connector_type'):
            validated_data['connector_type'] = 'WINDOWS_REMOTE' if os_type == 'WINDOWS' else 'SSH'
        if not validated_data.get('port'):
            validated_data['port'] = 22
        if not validated_data.get('hostname'):
            validated_data['hostname'] = f"ZK-{validated_data.get('username')}@{validated_data.get('ip_address')}"
        if not validated_data.get('display_name'):
            validated_data['display_name'] = validated_data.get('hostname')

        device = Device.objects.create(**validated_data)
        if credential_data:
            secret = credential_data.pop('secret', '')
            cred = DeviceCredential.objects.create(device=device, **credential_data)
            if secret:
                cred.set_secret(secret)
                cred.save()
        return device

    def update(self, instance, validated_data):
        credential_data = validated_data.pop('credential', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if credential_data:
            secret = credential_data.pop('secret', None)
            cred, _ = DeviceCredential.objects.get_or_create(device=instance)
            for attr, value in credential_data.items():
                setattr(cred, attr, value)
            if secret is not None:
                cred.set_secret(secret)
            cred.save()
        return instance
