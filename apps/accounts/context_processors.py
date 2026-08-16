def user_role_context(request):
    """Provides user role and permission flags to all templates."""
    if not request.user.is_authenticated:
        return {'user_profile': None, 'user_role': None}

    profile = getattr(request.user, 'profile', None)
    return {
        'user_profile': profile,
        'user_role': profile.role if profile else 'OPERATOR',
        'is_admin': profile.is_admin if profile else False,
        'is_operator': profile.is_operator if profile else False,
        'is_auditor': profile.is_auditor if profile else False,
        'is_readonly': profile.is_readonly if profile else False,
        'theme_preference': profile.theme_preference if profile else 'light',
    }
