import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

User = settings.AUTH_USER_MODEL

class Participant(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="participant")
    has_accepted = models.BooleanField(default=False)
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.user.email


class Invitation(models.Model):
    participant = models.OneToOneField(
        Participant,
        on_delete=models.CASCADE,
        related_name="invitation"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()

    @staticmethod
    def default_expiry():
        return timezone.now() + timedelta(hours=24)

    def __str__(self):
        return f"Invitation for {self.participant.user.email}"