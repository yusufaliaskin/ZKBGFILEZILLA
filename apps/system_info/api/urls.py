from django.urls import path
from . import views

app_name = 'system_info_api'

urlpatterns = [
    path('<uuid:device_id>/', views.DeviceSystemMetricsView.as_view(), name='metrics'),
]
