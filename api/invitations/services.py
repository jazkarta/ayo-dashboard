import uuid
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .models import Participant, Invitation
from .utils import InvitationMailer

User = get_user_model()

class ParticipantInviter:
    def __init__(self, email, username, first_name, last_name):
        self.email = email
        self.username = username
        self.first_name = first_name
        self.last_name = last_name
        self.user = None
        self.participant = None
        self.invitation = None

    def create_or_get_user(self):
        self.user, created = User.objects.get_or_create(email=self.email, username=self.username, is_active=False)
        if created:
            self.user.first_name = self.first_name
            self.user.last_name = self.last_name
            self.user.set_unusable_password()
            self.user.save()
        else:
            if self.user.is_active:
                raise ValidationError("User already registered and active")
        return self

    def create_or_get_participant(self):
        self.participant, _ = Participant.objects.get_or_create(user=self.user)
        return self

    def create_or_update_invitation(self):
        invitation = getattr(self, 'invitation', None)

        invitation = Invitation.objects.filter(
            participant=self.participant,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()

        if invitation:
            self.invitation = invitation
        else:
            self.invitation, _ = Invitation.objects.update_or_create(
                participant=self.participant,
                defaults={
                    "token": uuid.uuid4(),
                    "is_used": False,
                    "expires_at": Invitation.default_expiry()
                }
            )

        return self

    def send_invitation_email(self):
        mailer = InvitationMailer(self.participant, self.invitation.token)
        mailer.send_email()
        return self

    def invite(self):
        return self.create_or_get_user()\
                   .create_or_get_participant()\
                   .create_or_update_invitation()\
                   .send_invitation_email()