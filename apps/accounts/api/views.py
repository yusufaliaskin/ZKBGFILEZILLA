from rest_framework import views, status, permissions
from rest_framework.response import Response
from apps.accounts.api.serializers import UserSerializer, UserProfileSerializer
from apps.accounts.permissions import IsAdminUser


class CurrentUserView(views.APIView):
    """Returns the currently authenticated user's profile and permissions."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        data = serializer.data
        profile = getattr(request.user, 'profile', None)
        data['permissions'] = {
            'is_admin': profile.is_admin if profile else False,
            'is_operator': profile.is_operator if profile else False,
            'is_auditor': profile.is_auditor if profile else False,
            'is_readonly': profile.is_readonly if profile else False,
            'can_manage_devices': profile.can_manage_devices if profile else False,
            'can_manage_files': profile.can_manage_files if profile else False,
            'can_download_files': profile.can_download_files if profile else False,
            'can_use_terminal': profile.can_use_terminal if profile else False,
            'can_view_audit_logs': profile.can_view_audit_logs if profile else False,
        }
        return Response(data)


class UpdateThemeView(views.APIView):
    """API endpoint to update user theme preference."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        theme = request.data.get('theme')
        if theme not in ['light', 'dark']:
            return Response({'error': 'Geçersiz tema. "light" veya "dark" seçilmelidir.'}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(request.user, 'profile'):
            profile = request.user.profile
            profile.theme_preference = theme
            profile.save(update_fields=['theme_preference'])
            return Response({'status': 'success', 'theme': theme})
        return Response({'error': 'Kullanıcı profili bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)
