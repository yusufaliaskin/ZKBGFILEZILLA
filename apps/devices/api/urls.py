from django.urls import path
from . import views

app_name = 'devices_api'

urlpatterns = [
    path('', views.DeviceListCreateAPIView.as_view(), name='list_create'),
    path('terminal/execute/', views.TerminalUniversalExecuteAPIView.as_view(), name='terminal_execute'),
    path('terminal/exec/', views.TerminalUniversalExecuteAPIView.as_view(), name='terminal_exec_alias'),
    path('broadcast/', views.BroadcastCommandAPIView.as_view(), name='broadcast'),
    path('ping-all/', views.DeviceBatchPingAPIView.as_view(), name='ping_all'),
    path('sync-jobs/', views.SyncJobListCreateAPIView.as_view(), name='sync_jobs_list_create'),
    path('sync-jobs/<uuid:id>/run/', views.SyncJobRunAPIView.as_view(), name='sync_job_run'),
    path('<uuid:id>/', views.DeviceDetailAPIView.as_view(), name='detail'),
    path('<uuid:id>/connect/', views.DeviceConnectAPIView.as_view(), name='connect'),
    path('<uuid:id>/ping/', views.DevicePingAPIView.as_view(), name='ping'),
    path('<uuid:id>/system-info/', views.DeviceSystemInfoAPIView.as_view(), name='system_info'),
    path('<uuid:id>/execute/', views.DeviceExecuteCommandAPIView.as_view(), name='execute_command'),
    path('<uuid:id>/terminal/exec/', views.DeviceExecuteCommandAPIView.as_view(), name='device_terminal_exec_alias'),
]
