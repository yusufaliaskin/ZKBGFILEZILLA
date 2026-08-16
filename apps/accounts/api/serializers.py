from rest_framework import serializers
from django.contrib.auth.models import User
from apps.accounts.models import UserProfile, UserRole


class UserProfileSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'role', 'role_display', 'personnel_number',
            'department', 'phone_number', 'theme_preference',
            'last_activity', 'last_login_ip'
        ]
        read_only_fields = ['last_activity', 'last_login_ip']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined', 'profile']
