from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from .models import Device, DeviceStatus, DeviceOS


@login_required
def device_list_view(request):
    """Device inventory and management page with aggregated counts."""
    stats = Device.objects.aggregate(
        total=Count('id'),
        online=Count('id', filter=Q(status=DeviceStatus.ONLINE)),
        offline=Count('id', filter=Q(status=DeviceStatus.OFFLINE)),
        linux=Count('id', filter=Q(operating_system=DeviceOS.LINUX)),
        windows=Count('id', filter=Q(operating_system=DeviceOS.WINDOWS)),
    )
    return render(request, 'devices/list.html', {
        'total_devices': stats['total'] or 0,
        'online_devices': stats['online'] or 0,
        'offline_devices': stats['offline'] or 0,
        'linux_count': stats['linux'] or 0,
        'windows_count': stats['windows'] or 0,
    })


@login_required
def device_detail_view(request, device_id):
    """Device detail and quick action overview."""
    device = get_object_or_404(Device, id=device_id)
    return render(request, 'devices/detail.html', {
        'device': device,
    })


@login_required
def terminal_view(request, device_id=None):
    """Live interactive Remote Web Terminal / Shell view."""
    import platform
    import socket
    import sys
    from django.utils import timezone

    devices = Device.objects.all().order_by('hostname')
    selected_device = None
    if device_id:
        selected_device = get_object_or_404(Device, id=device_id)

    host_os_name = platform.system()
    host_os_version = platform.version()
    host_hostname = socket.gethostname()
    host_ip = request.META.get('REMOTE_ADDR') or '127.0.0.1'

    # Build dynamic host OS version string
    if host_os_name == 'Windows':
        win_ver = sys.getwindowsversion() if hasattr(sys, 'getwindowsversion') else None
        if win_ver:
            host_build_str = f"Microsoft Windows [Version {win_ver.major}.{win_ver.minor}.{win_ver.build}]"
        else:
            host_build_str = f"Microsoft Windows [Version {host_os_version}]"
        host_copyright_str = "(c) Microsoft Corporation. Tüm hakları saklıdır."
    elif host_os_name == 'Linux':
        host_build_str = f"Pardus GNU/Linux [Kernel {platform.release()}]"
        try:
            with open('/etc/os-release') as f:
                for line in f:
                    if line.startswith('PRETTY_NAME='):
                        host_build_str = line.split('=', 1)[1].strip('"\'\n')
                        break
            host_build_str += f" [Kernel {platform.release()}]"
        except Exception:
            pass
        host_copyright_str = "(c) TÜBİTAK ULAKBİM - Pardus Projesi. Tüm hakları saklıdır."
    else:
        host_build_str = f"{host_os_name} [Version {host_os_version}]"
        host_copyright_str = "(c) Tüm hakları saklıdır."

    now_local = timezone.localtime(timezone.now())
    turkish_days = {'Mon': 'Pzt', 'Tue': 'Sal', 'Wed': 'Çar', 'Thu': 'Per', 'Fri': 'Cum', 'Sat': 'Cmt', 'Sun': 'Paz'}
    turkish_months = {'Jan': 'Oca', 'Feb': 'Şub', 'Mar': 'Mar', 'Apr': 'Nis', 'May': 'May', 'Jun': 'Haz', 'Jul': 'Tem', 'Aug': 'Ağu', 'Sep': 'Eyl', 'Oct': 'Eki', 'Nov': 'Kas', 'Dec': 'Ara'}
    
    eng_day = now_local.strftime('%a')
    eng_month = now_local.strftime('%b')
    tr_day = turkish_days.get(eng_day, eng_day)
    tr_month = turkish_months.get(eng_month, eng_month)
    current_time_str = f"{tr_day} {tr_month} {now_local.strftime('%d %H:%M:%S %Y')}"

    return render(request, 'devices/terminal.html', {
        'devices': devices,
        'selected_device': selected_device,
        'host_os': host_os_name,
        'host_build_str': host_build_str,
        'host_copyright_str': host_copyright_str,
        'host_hostname': host_hostname,
        'host_ip': host_ip,
        'current_time_str': current_time_str,
    })


@login_required
def device_rdp_download_view(request, device_id):
    """Generates and serves a standard Microsoft Remote Desktop (.rdp) connection profile."""
    from django.http import HttpResponse
    device = get_object_or_404(Device, id=device_id)

    port = device.port if device.port and device.port != 22 else 3389
    rdp_content = f"""screen mode id:i:2
use multimon:i:0
desktopwidth:i:1920
desktopheight:i:1080
session bpp:i:32
winposstr:s:0,3,0,0,800,600
compression:i:1
keyboardhook:i:2
audiomode:i:0
redirectprinters:i:0
redirectcomports:i:0
redirectsmartcards:i:1
redirectclipboard:i:1
redirectposdevices:i:0
displayconnectionbar:i:1
autoreconnection enabled:i:1
authentication level:i:2
prompt for credentials:i:1
negotiate security layer:i:1
remoteapplicationmode:i:0
alternate shell:s:
shell working directory:s:
gatewayhostname:s:
gatewayusagemethod:i:4
gatewaycredentialssource:i:4
gatewayprofileusagemethod:i:0
promptcredentialonce:i:0
gatewaybrokeringtype:i:0
use redirection server name:i:0
rdgiskdcproxy:i:0
kdcproxyname:s:
full address:s:{device.ip_address}:{port}
username:s:{device.username}
domain:s:{device.domain or ''}
"""
    response = HttpResponse(rdp_content, content_type='application/x-rdp')
    safe_name = device.hostname.replace(' ', '_')
    response['Content-Disposition'] = f'attachment; filename="ZK-{safe_name}.rdp"'
    return response


