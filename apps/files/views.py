from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from apps.devices.models import Device


@login_required
def file_manager_view(request, device_id=None):
    """
    Main File Manager UI (Remote File System Explorer & Editor).
    Supports device_id from URL path or ?device_id= query param.
    """
    devices = Device.objects.filter(is_enabled=True).order_by('hostname')
    selected_device = None
    target_id = device_id or request.GET.get('device_id')
    if target_id:
        try:
            selected_device = Device.objects.filter(id=target_id).first()
        except Exception:
            selected_device = None

    return render(request, 'files/manager.html', {
        'devices': devices,
        'selected_device': selected_device,
    })


@login_required
def file_transfer_view(request, device_id=None):
    """
    Dual-Pane FileZilla Data Transfer Center (Local <-> Remote).
    """
    devices = Device.objects.filter(is_enabled=True).order_by('hostname')
    selected_device = None
    target_id = device_id or request.GET.get('device_id')
    if target_id:
        try:
            selected_device = Device.objects.filter(id=target_id).first()
        except Exception:
            selected_device = None

    return render(request, 'files/transfer.html', {
        'devices': devices,
        'selected_device': selected_device,
    })
