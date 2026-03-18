from django.core.mail import send_mail
from django.conf import settings

class InvitationMailer:
    def __init__(self, participant, token):
        self.participant = participant
        self.token = token

    def send_email(self):
        link = f"{settings.FRONTEND_URL}/accept-invite?token={self.token}"
        send_mail(
            subject="You're invited!",
            message=f"Hi {self.participant.user.first_name}, click to activate your account: {link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[self.participant.user.email],
        )