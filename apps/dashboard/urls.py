from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.dashboard_view, name='root'),
    path('dashboard/', views.dashboard_view, name='index'),
    path('export/inventory/', views.export_inventory_csv, name='export_inventory'),
    path('export/inventory/csv/', views.export_inventory_csv, name='export_inventory_csv'),
    path('export/audit/', views.export_audit_csv, name='export_audit'),
    path('export/audit/csv/', views.export_audit_csv, name='export_audit_csv'),
]
