from django import template

register = template.Library()

@register.filter
def is_administrator(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    profile = getattr(user, 'profile', None)
    return profile.is_admin if profile else False

@register.filter
def is_operator_or_above(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    profile = getattr(user, 'profile', None)
    return profile.is_operator if profile else False

@register.filter
def user_role(user):
    if not user or not user.is_authenticated:
        return "Misafir"
    if user.is_superuser:
        return "Sistem Yöneticisi"
    profile = getattr(user, 'profile', None)
    if profile:
        return profile.get_role_display()
    return "Kullanıcı"

@register.filter
def has_perm(user, perm_name):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    profile = getattr(user, 'profile', None)
    if not profile:
        return False
    return getattr(profile, perm_name, False)
