from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile, UserRole


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """Automatically create UserProfile for new Users."""
    if created:
        role = UserRole.ADMIN if instance.is_superuser else UserRole.OPERATOR
        UserProfile.objects.create(
            user=instance,
            role=role,
            personnel_number=f"ZK{instance.id:05d}"
        )
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
