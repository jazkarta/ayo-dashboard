from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from common.models.base_models import BaseModel


class Invitation(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_invitations'
    )

    parent_email = models.EmailField()
    expiry_date = models.DateTimeField(_('expiry date'))
    is_active = models.BooleanField(_('is active'), default=True)
    has_accepted = models.BooleanField(_('has accepted'), default=False)

    def __str__(self):
        return f"Invitation for {self.user.username} (Active: {self.is_active})"

    class Meta:
        verbose_name = _('Invitation')
        verbose_name_plural = _('Invitations')
        ordering = ['-created_at']
        db_table = 'participant_invitation'
