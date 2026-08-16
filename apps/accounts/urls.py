from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('settings/', views.settings_view, name='settings'),
    path('manage/', views.manage_view, name='manage'),
    path('set-theme/', views.set_theme_preference, name='set_theme'),
    
    # Management APIs
    path('api/manage/users/create/', views.api_user_create, name='api_user_create'),
    path('api/manage/users/<int:user_id>/update/', views.api_user_update, name='api_user_update'),
    path('api/manage/users/<int:user_id>/toggle-freeze/', views.api_user_toggle_freeze, name='api_user_toggle_freeze'),
    path('api/manage/users/<int:user_id>/delete/', views.api_user_delete, name='api_user_delete'),
    path('api/manage/departments/create/', views.api_department_create, name='api_department_create'),
    path('api/manage/departments/<int:dept_id>/update/', views.api_department_update, name='api_department_update'),
    path('api/manage/departments/<int:dept_id>/delete/', views.api_department_delete, name='api_department_delete'),
]
