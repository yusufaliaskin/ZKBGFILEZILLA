import csv
from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from apps.accounts.decorators import require_roles
from apps.accounts.models import UserRole
from apps.audit.models import AuditLog, AuditOperation, AuditStatus


@login_required
def audit_list_view(request):
    """Audit log inspection page with aggregated counts."""
    operations = AuditOperation.choices
    statuses = AuditStatus.choices
    
    stats = AuditLog.objects.aggregate(
        total=Count('id'),
        success=Count('id', filter=Q(status=AuditStatus.SUCCESS)),
        failure=Count('id', filter=Q(status=AuditStatus.FAILURE)),
    )
    return render(request, 'audit/list.html', {
        'operations': operations,
        'statuses': statuses,
        'total_logs': stats['total'] or 0,
        'success_logs': stats['success'] or 0,
        'failure_logs': stats['failure'] or 0,
    })


@login_required
def audit_export_csv_view(request):
    """Export audit logs as CSV with UTF-8 BOM."""
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = 'attachment; filename="zk_audit_logs.csv"'

    writer = csv.writer(response)
    writer.writerow(['Zaman Damgası', 'Kullanıcı', 'İşlem Türü', 'Hedef Sunucu / IP', 'Yol / Detay', 'Durum', 'İstemci IP'])

    logs = AuditLog.objects.select_related('user', 'device').order_by('-timestamp')[:2000]
    for log in logs:
        writer.writerow([
            log.timestamp.strftime('%d.%m.%Y %H:%M:%S'),
            log.user.username if log.user else 'Sistem',
            log.get_operation_display() if hasattr(log, 'get_operation_display') else log.operation,
            log.device.hostname if log.device else '-',
            log.path or '-',
            log.status,
            log.ip_address or '-',
        ])
    return response


@login_required
def audit_export_excel_view(request):
    """Export audit logs as Excel-compatible spreadsheet table."""
    response = HttpResponse(content_type='application/vnd.ms-excel; charset=utf-8-sig')
    response['Content-Disposition'] = 'attachment; filename="zk_denetim_raporu.xls"'

    logs = AuditLog.objects.select_related('user', 'device').order_by('-timestamp')[:2000]
    html = ['<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">']
    html.append('<head><meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"></head><body>')
    html.append('<table border="1">')
    html.append('<tr style="background-color:#B8050F;color:#FFFFFF;font-weight:bold;">')
    html.append('<th>Zaman Damgası</th><th>Kullanıcı</th><th>İşlem Türü</th><th>Hedef Düğüm</th><th>Hedef IP</th><th>Yol / Parametre</th><th>Durum</th><th>İstemci IP</th>')
    html.append('</tr>')

    for log in logs:
        status_color = '#10B981' if log.status == 'SUCCESS' else '#EF4444'
        html.append('<tr>')
        html.append(f'<td>{log.timestamp.strftime("%d.%m.%Y %H:%M:%S")}</td>')
        html.append(f'<td>{log.user.username if log.user else "Sistem"}</td>')
        html.append(f'<td>{log.get_operation_display() if hasattr(log, "get_operation_display") else log.operation}</td>')
        html.append(f'<td>{log.device.hostname if log.device else "-"}</td>')
        html.append(f'<td>{log.device.ip_address if log.device else "-"}</td>')
        html.append(f'<td>{log.path or "-"}</td>')
        html.append(f'<td style="color:{status_color};font-weight:bold;">{log.status}</td>')
        html.append(f'<td>{log.ip_address or "-"}</td>')
        html.append('</tr>')

    html.append('</table></body></html>')
    response.write('\n'.join(html))
    return response


@login_required
def audit_export_pdf_view(request):
    """Printable official audit ledger view."""
    logs = AuditLog.objects.select_related('user', 'device').order_by('-timestamp')[:500]
    return render(request, 'audit/report_print.html', {
        'logs': logs,
        'total_count': logs.count(),
        'generated_by': request.user,
    })
