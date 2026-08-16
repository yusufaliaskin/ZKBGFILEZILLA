from django.urls import path
from . import views

app_name = 'devices'

urlpatterns = [
    path('', views.device_list_view, name='list'),
    path('<uuid:device_id>/', views.device_detail_view, name='detail'),
    path('terminal/', views.terminal_view, name='terminal'),
    path('terminal/<uuid:device_id>/', views.terminal_view, name='terminal_device'),
    path('<uuid:device_id>/rdp/', views.device_rdp_download_view, name='rdp_download'),
]
