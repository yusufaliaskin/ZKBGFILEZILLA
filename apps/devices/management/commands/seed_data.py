"""
Database seeding command for ZK Remote Operations Center.
Creates only the initial administrator superuser account for first-time setup.
No mock devices, no sample audit logs, no dummy credentials.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.accounts.models import UserProfile, UserRole


class Command(BaseCommand):
    help = 'İlk kurulumda yönetici (admin) hesabını oluşturur. Sahte veri üretmez.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='admin',
            help='Yönetici kullanıcı adı (varsayılan: admin)',
        )
        parser.add_argument(
            '--password',
            type=str,
            default=None,
            help='Yönetici şifresi (belirtilmezse interaktif olarak sorulur)',
        )

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']

        # Interactive password prompt if not provided
        if not password:
            import getpass
            password = getpass.getpass(f"'{username}' için şifre belirleyin: ")
            if not password:
                self.stderr.write(self.style.ERROR('Şifre boş bırakılamaz.'))
                return

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'first_name': 'Sistem',
                'last_name': 'Yöneticisi',
                'is_superuser': True,
                'is_staff': True,
            }
        )
        user.set_password(password)
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = UserRole.ADMIN
        profile.department = 'Sistem Yönetimi'
        profile.save()

        status_str = 'oluşturuldu' if created else 'güncellendi'
        self.stdout.write(self.style.SUCCESS(
            f"Yönetici hesabı '{username}' başarıyla {status_str}."
        ))
        self.stdout.write(self.style.NOTICE(
            'Cihazları ve kullanıcıları web arayüzünden yönetin.'
        ))
