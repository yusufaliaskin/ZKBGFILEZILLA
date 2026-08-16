from django.shortcuts import get_object_or_404
from rest_framework import views, permissions, status
from rest_framework.response import Response
from apps.devices.models import Device
from apps.connectors.factory import ConnectorFactory


class DeviceSystemMetricsView(views.APIView):
    """
    GET: Live telemetry of CPU, Memory, Disk, Uptime, OS details.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        try:
            connector = ConnectorFactory.get_connector(device)
            metrics = connector.get_system_info()
            return Response(metrics.to_dict(), status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
