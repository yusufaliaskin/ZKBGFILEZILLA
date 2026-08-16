from django.urls import path
from . import views

app_name = 'audit'

urlpatterns = [
    path('', views.audit_list_view, name='list'),
    path('export/csv/', views.audit_export_csv_view, name='export_csv'),
    path('export/excel/', views.audit_export_excel_view, name='export_excel'),
    path('export/pdf/', views.audit_export_pdf_view, name='export_pdf'),
]
