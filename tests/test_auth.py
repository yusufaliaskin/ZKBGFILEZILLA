from django.test import TestCase, Client
from django.contrib.auth.models import User
from apps.accounts.models import UserProfile, UserRole


class AuthAndRBACTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin_user = User.objects.create_user(
            username='admin_test',
            password='password123',
            is_superuser=True
        )
        self.operator_user = User.objects.create_user(
            username='op_test',
            password='password123'
        )
        self.readonly_user = User.objects.create_user(
            username='ro_test',
            password='password123'
        )
        # Update roles
        self.readonly_user.profile.role = UserRole.READ_ONLY
        self.readonly_user.profile.save()

    def test_user_profile_creation(self):
        """Tests that UserProfile is automatically created via signals."""
        self.assertIsNotNone(self.admin_user.profile)
        self.assertTrue(self.admin_user.profile.is_admin)
        self.assertTrue(self.operator_user.profile.is_operator)
        self.assertTrue(self.readonly_user.profile.is_readonly)

    def test_permission_helpers(self):
        """Tests permission helper methods on UserProfile."""
        self.assertTrue(self.admin_user.profile.can_manage_devices)
        self.assertFalse(self.operator_user.profile.can_manage_devices)
        self.assertFalse(self.readonly_user.profile.can_manage_devices)

        self.assertTrue(self.admin_user.profile.can_manage_files)
        self.assertTrue(self.operator_user.profile.can_manage_files)
        self.assertFalse(self.readonly_user.profile.can_manage_files)

    def test_login_flow(self):
        """Tests successful login and redirect."""
        response = self.client.post('/login/', {
            'username': 'admin_test',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, 302)
        self.assertIn('/dashboard/', response.url)

    def test_invalid_login(self):
        """Tests failed login with wrong credentials."""
        response = self.client.post('/login/', {
            'username': 'admin_test',
            'password': 'wrong_password'
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'hatalı')
