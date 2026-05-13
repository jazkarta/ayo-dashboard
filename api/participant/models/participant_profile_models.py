from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel
from .guardian_models import Guardian


class ParticipantProfile(BaseModel):
    GENDER_CHOICES = [
        ('M', _('Male')),
        ('F', _('Female')),
        ('O', _('Other')),
        ('N', _('Prefer not to say')),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='participant_profile'
    )
    guardian = models.OneToOneField(
        Guardian,
        on_delete=models.CASCADE,
        related_name='participant_profile',
        blank=True,
        null=True
    )

    date_of_birth = models.DateField(_('date of birth'))
    gender = models.CharField(
        _('gender'),
        max_length=1,
        choices=GENDER_CHOICES,
        blank=True,
        null=True
    )
    family_id = models.CharField(
        _('family id'),
        max_length=255,
    )
    cohort = models.ForeignKey(
        'cohort.Cohort',
        on_delete=models.SET_NULL,
        related_name='participants',
        blank=True,
        null=True
    )
    demographics = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"

    class Meta:
        verbose_name = _('Participant Profile')
        verbose_name_plural = _('Participant Profiles')
        db_table = 'participant_profile'
