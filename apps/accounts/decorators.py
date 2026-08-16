from functools import wraps
from django.core.exceptions import PermissionDenied


def require_roles(*allowed_roles):
    """
    Decorator for views that checks if the user has one of the allowed roles.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                from django.contrib.auth.views import redirect_to_login
                return redirect_to_login(request.get_full_path())
            if request.user.is_superuser:
                return view_func(request, *args, **kwargs)
            profile = getattr(request.user, 'profile', None)
            if profile and profile.role in allowed_roles:
                return view_func(request, *args, **kwargs)
            raise PermissionDenied("Bu sayfaya erişim yetkiniz bulunmamaktadır.")
        return _wrapped_view
    return decorator
