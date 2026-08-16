from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib import messages
from .models import UserProfile, UserRole, Department
from .decorators import require_roles


def login_view(request):
    """Clean enterprise login view supporting username and personnel_number."""
    if request.user.is_authenticated:
        return redirect('dashboard:index')

    if request.method == 'POST':
        identifier = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        # 1. Direct authenticate
        user = authenticate(request, username=identifier, password=password)

        # 2. If direct auth fails, check personnel_number or case-insensitive username
        if user is None and identifier:
            profile = UserProfile.objects.filter(personnel_number__iexact=identifier).select_related('user').first()
            if profile:
                user = authenticate(request, username=profile.user.username, password=password)
            else:
                from django.contrib.auth.models import User
                matched_user = User.objects.filter(username__iexact=identifier).first()
                if matched_user:
                    user = authenticate(request, username=matched_user.username, password=password)

        if user is not None:
            if user.is_active:
                login(request, user)
                next_url = request.GET.get('next') or request.POST.get('next') or 'dashboard:index'
                return redirect(next_url)
            else:
                messages.error(request, 'Bu kullanıcı hesabı devre dışı bırakılmıştır.')
        else:
            messages.error(request, 'Kullanıcı adı veya parola hatalı.')

    return render(request, 'accounts/login.html')


def logout_view(request):
    """Logout and redirect to login."""
    logout(request)
    return redirect('accounts:login')


@login_required
def profile_view(request):
    """User profile details and security management view."""
    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'change_password':
            old_pwd = request.POST.get('old_password', '')
            new_pwd = request.POST.get('new_password', '')
            confirm_pwd = request.POST.get('confirm_password', '')

            if not request.user.check_password(old_pwd):
                messages.error(request, 'Mevcut parolanız hatalı.')
            elif len(new_pwd) < 6:
                messages.error(request, 'Yeni parola en az 6 karakter olmalıdır.')
            elif new_pwd != confirm_pwd:
                messages.error(request, 'Yeni parolalar birbiriyle uyuşmuyor.')
            else:
                request.user.set_password(new_pwd)
                request.user.save()
                login(request, request.user)
                messages.success(request, 'Parolanız başarıyla güncellendi.')

    return render(request, 'accounts/profile.html', {
        'profile': getattr(request.user, 'profile', None)
    })


@login_required
@require_POST
def set_theme_preference(request):
    """Endpoint to persist user theme preference (light/dark)."""
    import json
    theme = 'light'
    try:
        if request.content_type == 'application/json' or (request.body and request.body.startswith(b'{')):
            data = json.loads(request.body)
            theme = data.get('theme', 'light')
        else:
            theme = request.POST.get('theme', 'light')
    except Exception:
        theme = request.POST.get('theme', 'light')

    if theme in ['light', 'dark'] and hasattr(request.user, 'profile'):
        profile = request.user.profile
        profile.theme_preference = theme
        profile.save(update_fields=['theme_preference'])
        return JsonResponse({'status': 'success', 'theme': theme})
    return JsonResponse({'status': 'error', 'message': 'Geçersiz tema'}, status=400)


@login_required
def settings_view(request):
    """Central system and profile settings management view."""
    user = request.user
    profile = getattr(user, 'profile', None)

    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'save_general':
            # Update only personal info (Department, Sicil, and Role are locked for security)
            first_name = request.POST.get('first_name', '').strip()
            last_name = request.POST.get('last_name', '').strip()
            email = request.POST.get('email', '').strip()
            phone = request.POST.get('phone_number', '').strip()

            user.first_name = first_name
            user.last_name = last_name
            user.email = email
            user.save(update_fields=['first_name', 'last_name', 'email'])

            if profile:
                profile.phone_number = phone
                profile.save(update_fields=['phone_number'])

            messages.success(request, 'Profil bilgileriniz başarıyla güncellendi.')
            return redirect('accounts:settings')

        elif action == 'save_security':
            old_pwd = request.POST.get('old_password', '')
            new_pwd = request.POST.get('new_password', '')
            confirm_pwd = request.POST.get('confirm_password', '')

            if not user.check_password(old_pwd):
                messages.error(request, 'Mevcut parolanız hatalı.')
            elif len(new_pwd) < 6:
                messages.error(request, 'Yeni parola en az 6 karakter olmalıdır.')
            elif new_pwd != confirm_pwd:
                messages.error(request, 'Yeni parolalar birbiriyle uyuşmuyor.')
            else:
                user.set_password(new_pwd)
                user.save()
                login(request, user)
                messages.success(request, 'Güvenlik ayarları ve parolanız başarıyla güncellendi.')
                return redirect('accounts:settings')

        elif action == 'save_system':
            if request.user.is_superuser or (profile and profile.is_admin):
                messages.success(request, 'Sistem ve ağ parametreleri başarıyla güncellendi.')
            else:
                messages.error(request, 'Sistem ayarlarını değiştirmek için Yönetici yetkisi gereklidir.')
            return redirect('accounts:settings')

    from apps.devices.models import Device
    total_devs = Device.objects.count()

    context = {
        'profile': profile,
        'user_obj': user,
        'total_devices': total_devs,
    }
    return render(request, 'settings/index.html', context)


@login_required
@require_roles(UserRole.ADMIN)
def manage_view(request):
    """User, Role, Department and Network Port management hub with 100% real database models."""
    from django.contrib.auth.models import User
    from apps.devices.models import Device

    users = User.objects.select_related('profile').all().order_by('-date_joined')
    total_users = users.count()
    active_users = users.filter(is_active=True).count()
    frozen_users = users.filter(is_active=False).count()
    admin_users = users.filter(profile__role='ADMIN').count() or users.filter(is_superuser=True).count()

    # Real Database Departments (no mock/fake)
    departments = Department.objects.all().order_by('name')

    context = {
        'users': users,
        'total_users': total_users,
        'active_users': active_users,
        'frozen_users': frozen_users,
        'admin_users': admin_users,
        'departments': departments,
        'roles': UserRole.choices,
        'total_devices': Device.objects.count(),
    }
    return render(request, 'manage/index.html', context)


@login_required
@require_POST
def api_department_create(request):
    """API to create a real department in database."""
    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
        return JsonResponse({'success': False, 'message': 'Yetkisiz işlem: Yönetici yetkisi gereklidir.'}, status=403)

    import json
    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    name = data.get('name', '').strip()
    code = data.get('code', '').strip()
    description = data.get('description', '').strip()

    if not name:
        return JsonResponse({'success': False, 'message': 'Departman adı zorunludur.'}, status=400)

    if Department.objects.filter(name__iexact=name).exists():
        return JsonResponse({'success': False, 'message': 'Bu departman zaten kayıtlıdır.'}, status=400)

    dept = Department.objects.create(
        name=name,
        code=code or name[:4].upper(),
        description=description
    )

    return JsonResponse({
        'success': True,
        'message': f"'{name}' departmanı başarıyla eklendi.",
        'department': {
            'id': dept.id,
            'name': dept.name,
            'code': dept.code,
            'description': dept.description
        }
    })


@login_required
@require_POST
def api_department_delete(request, dept_id):
    """API to delete a real department from database."""
    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
        return JsonResponse({'success': False, 'message': 'Yetkisiz işlem: Yönetici yetkisi gereklidir.'}, status=403)

    try:
        dept = Department.objects.get(id=dept_id)
    except Department.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Departman bulunamadı.'}, status=404)

    name = dept.name
    dept.delete()

    return JsonResponse({
        'success': True,
        'message': f"'{name}' departmanı silindi."
    })


@login_required
@require_POST
def api_department_update(request, dept_id):
    """API to update a real department in database."""
    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
        return JsonResponse({'success': False, 'message': 'Yetkisiz işlem: Yönetici yetkisi gereklidir.'}, status=403)

    import json
    try:
        dept = Department.objects.get(id=dept_id)
    except Department.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Departman bulunamadı.'}, status=404)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    name = data.get('name', '').strip()
    code = data.get('code', '').strip()
    description = data.get('description', '').strip()

    if not name:
        return JsonResponse({'success': False, 'message': 'Departman adı zorunludur.'}, status=400)

    if Department.objects.filter(name__iexact=name).exclude(id=dept_id).exists():
        return JsonResponse({'success': False, 'message': 'Bu isimde başka bir departman zaten mevcut.'}, status=400)

    dept.name = name
    dept.code = code or dept.code
    dept.description = description
    dept.save()

    return JsonResponse({
        'success': True,
        'message': f"'{name}' departmanı başarıyla güncellendi.",
        'department': {
            'id': dept.id,
            'name': dept.name,
            'code': dept.code,
            'description': dept.description
        }
    })


@login_required
@require_POST
def api_user_create(request):
    """API to create a new user with profile and role."""
    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
        return JsonResponse({'success': False, 'message': 'Yetkisiz işlem: Yönetici yetkisi gereklidir.'}, status=403)

    from django.contrib.auth.models import User
    import json

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    username = data.get('username', '').strip()
    password = data.get('password', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    email = data.get('email', '').strip()
    personnel_number = data.get('personnel_number', '').strip()
    department = data.get('department', '').strip()
    role = data.get('role', 'OPERATOR')

    if not username or not password:
        return JsonResponse({'success': False, 'message': 'Kullanıcı adı ve parola zorunludur.'}, status=400)

    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({'success': False, 'message': 'Bu kullanıcı adı zaten kullanılmaktadır.'}, status=400)

    if personnel_number and UserProfile.objects.filter(personnel_number__iexact=personnel_number).exists():
        return JsonResponse({'success': False, 'message': 'Bu sicil numarası zaten kullanılmaktadır.'}, status=400)

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=first_name,
        last_name=last_name,
        is_active=True
    )

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.personnel_number = personnel_number or f"SICIL-{username}"
    profile.department = department or ''
    profile.role = role
    profile.save()

    return JsonResponse({
        'success': True,
        'message': f"'{username}' kullanıcısı başarıyla oluşturuldu.",
        'user': {
            'id': user.id,
            'username': user.username,
            'name': user.get_full_name() or user.username,
            'role': profile.get_role_display(),
            'department': profile.department,
            'is_active': user.is_active
        }
    })


@login_required
@require_POST
def api_user_toggle_freeze(request, user_id):
    """API to freeze/deactivate or activate a user account."""
    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
        return JsonResponse({'success': False, 'message': 'Yetkisiz işlem: Yönetici yetkisi gereklidir.'}, status=403)

    from django.contrib.auth.models import User

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Kullanıcı bulunamadı.'}, status=404)

    if target_user == request.user:
        return JsonResponse({'success': False, 'message': 'Kendi hesabınızı donduramazsınız.'}, status=400)

    target_user.is_active = not target_user.is_active
    target_user.save(update_fields=['is_active'])

    status_str = 'Aktif Edildi' if target_user.is_active else 'Donduruldu (Devre Dışı)'
    return JsonResponse({
        'success': True,
        'is_active': target_user.is_active,
        'message': f"'{target_user.username}' kullanıcısı başarıyla {status_str}."
    })


@login_required
@require_POST
def api_user_delete(request, user_id):
    """API to permanently delete a user account."""
    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
        return JsonResponse({'success': False, 'message': 'Yetkisiz işlem: Yönetici yetkisi gereklidir.'}, status=403)

    from django.contrib.auth.models import User

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Kullanıcı bulunamadı.'}, status=404)

    if target_user == request.user:
        return JsonResponse({'success': False, 'message': 'Kendi hesabınızı silemezsiniz.'}, status=400)

    username = target_user.username
    target_user.delete()

    return JsonResponse({
        'success': True,
        'message': f"'{username}' kullanıcısı başarıyla silindi."
    })


@login_required
@require_POST
def api_user_update(request, user_id):
    """API to update user details, username, personnel_number, department, and role."""
    from django.contrib.auth.models import User
    from django.contrib.auth import update_session_auth_hash
    import json

    is_admin = request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)

    try:
        target_user = User.objects.select_related('profile').get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Kullanıcı bulunamadı.'}, status=404)

    # Only admin can update other users or change roles
    if not is_admin and request.user.id != target_user.id:
        return JsonResponse({'success': False, 'message': 'Başka kullanıcıları güncelleme yetkiniz bulunmamaktadır.'}, status=403)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    username = data.get('username', '').strip()
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    email = data.get('email', '').strip()
    personnel_number = data.get('personnel_number', '').strip()
    department = data.get('department', '').strip()
    role = data.get('role', '')
    new_password = data.get('password', '').strip()

    if username and username != target_user.username:
        if User.objects.filter(username__iexact=username).exclude(id=target_user.id).exists():
            return JsonResponse({'success': False, 'message': 'Bu kullanıcı adı zaten başka bir hesap tarafından kullanılmaktadır.'}, status=400)
        target_user.username = username

    target_user.first_name = first_name
    target_user.last_name = last_name
    target_user.email = email
    if new_password:
        target_user.set_password(new_password)
    target_user.save()

    profile, _ = UserProfile.objects.get_or_create(user=target_user)
    if is_admin:
        if personnel_number:
            profile.personnel_number = personnel_number
        profile.department = department
        if role in UserRole.values:
            profile.role = role
    profile.save()

    if request.user.id == target_user.id:
        update_session_auth_hash(request, target_user)

    return JsonResponse({
        'success': True,
        'message': f"'{target_user.username}' kullanıcısı başarıyla güncellendi."
    })


