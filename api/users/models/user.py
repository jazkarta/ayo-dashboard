from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class UserRole(models.TextChoices):
    ADMIN = 'admin', _('Admin')
    PARTICIPANT = 'participants', _('Participants')
    RESEARCHER = 'researchers', _('Researchers')


class User(AbstractUser):
    """
    Custom user model inheriting from AbstractUser.
    """
    email = models.EmailField(_('email address'), unique=True)
    username = models.CharField(_('username'), max_length=150, unique=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.PARTICIPANT,
    )

    def __str__(self):
        return self.username
