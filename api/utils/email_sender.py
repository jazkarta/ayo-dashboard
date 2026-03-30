from django.core.mail import send_mail
from django.conf import settings

def send_invitation_email(to_email, context):
    """
    Sends a plain-text invitation email to the guardian.
    """
    invitation_link = f"{settings.DASHBOARD_URL}/invitation/{context['invitation_id']}/"
    subject = "Your child has a new invitation"
    message = (
        f"Hello,\n\n"
        f"Your child {context['participant_name']} has been invited by {context['invited_by']}.\n"
        f"Invitation link: {invitation_link}\n\n"
        f"Invitation expires on {context['expiry_date']}.\n"
        f"Thank you."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        fail_silently=False,
    )