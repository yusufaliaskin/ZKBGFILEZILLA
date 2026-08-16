from django.urls import path
from . import views

app_name = 'audit_api'

urlpatterns = [
    path('', views.AuditLogListAPIView.as_view(), name='list'),
    path('notifications/', views.NotificationListAPIView.as_view(), name='notifications'),
    path('notifications/mark-read/', views.NotificationMarkReadAPIView.as_view(), name='notifications_mark_read'),
]
