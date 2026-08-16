from django.utils import timezone


class SessionSecurityMiddleware:
    """Tracks last user activity timestamp and client IP."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated and hasattr(request.user, 'profile'):
            # Update last activity every 5 minutes to avoid excessive DB writes
            profile = request.user.profile
            now = timezone.now()
            if not profile.last_activity or (now - profile.last_activity).total_seconds() > 300:
                profile.last_activity = now
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip = x_forwarded_for.split(',')[0].strip()
                else:
                    ip = request.META.get('REMOTE_ADDR')
                profile.last_login_ip = ip
                profile.save(update_fields=['last_activity', 'last_login_ip'])

        response = self.get_response(request)
        return response
