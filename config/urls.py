"""
Root URL Configuration for ZK Remote Operations Center.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.devices import views as device_views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Direct Root Pages
    path('', include('apps.dashboard.urls')),
    path('', include('apps.accounts.urls')),
    path('terminal/', device_views.terminal_view, name='terminal'),
    path('terminal/<uuid:device_id>/', device_views.terminal_view, name='terminal_device'),
    path('devices/', include('apps.devices.urls')),
    path('files/', include('apps.files.urls')),
    path('audit/', include('apps.audit.urls')),
    
    # REST API Endpoints
    path('api/auth/', include('apps.accounts.api.urls')),
    path('api/devices/', include('apps.devices.api.urls')),
    path('api/devices/<uuid:device_id>/files/', include('apps.files.api.urls')),
    path('api/audit/', include('apps.audit.api.urls')),
    path('api/dashboard/', include('apps.dashboard.api.urls')),
    path('api/system-info/', include('apps.system_info.api.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
