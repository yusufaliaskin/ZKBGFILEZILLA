from django.urls import path
from . import views

app_name = 'accounts_api'

urlpatterns = [
    path('me/', views.CurrentUserView.as_view(), name='current_user'),
    path('theme/', views.UpdateThemeView.as_view(), name='update_theme'),
]
