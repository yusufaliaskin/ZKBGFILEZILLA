from django.urls import path
from . import views

app_name = 'dashboard_api'

urlpatterns = [
    path('stats/', views.DashboardStatsAPIView.as_view(), name='stats'),
    path('activity/', views.DashboardActivityAPIView.as_view(), name='activity'),
    path('distribution/', views.DashboardDistributionAPIView.as_view(), name='distribution'),
]
