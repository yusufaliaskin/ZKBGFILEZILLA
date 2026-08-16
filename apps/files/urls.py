from django.urls import path
from . import views

app_name = 'files'

urlpatterns = [
    path('', views.file_manager_view, name='manager'),
    path('transfer/', views.file_transfer_view, name='transfer'),
    path('transfer/<uuid:device_id>/', views.file_transfer_view, name='device_transfer'),
    path('<uuid:device_id>/', views.file_manager_view, name='device_manager'),
]
