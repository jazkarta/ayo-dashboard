import logging
from typing import Optional

from django.core.mail import EmailMessage
from django.conf import settings

from .email_template_manager import EmailTemplateManager
from utils.configuration.resolver import build_connection, get_email_connection, resolve_email_config
from utils.configuration.strategies.database_strategy import DatabaseEmailConfigurationStrategy

logger = logging.getLogger(__name__)


class EmailManager:

    def __init__(self):
        self.email_template_manager = EmailTemplateManager()

    def _send_email(
        self,
        subject: str,
        to: str,
        body: str,
        from_email: Optional[str] = None,
        attachments: Optional[list] = None,
        connection=None,
    ) -> bool:
        """
        Low-level method responsible solely for dispatching an email.
        All business methods should call this instead of send_mail directly.

        :param subject: Email subject line.
        :param to: Recipient email address.
        :param body: Plain-text email body.
        :param from_email: Sender address. Defaults to settings.DEFAULT_FROM_EMAIL.
        :param attachments: Optional list of (filename, content, mimetype) tuples.
        :returns: True if sent successfully, False otherwise.
        """
        try:
            if connection is None or from_email is None:
                config = resolve_email_config()
                if connection is None:
                    connection = get_email_connection(config)
                if from_email is None:
                    from_email = (config or {}).get('from_email') or settings.DEFAULT_FROM_EMAIL

            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=from_email,
                to=[to],
                connection=connection,
            )
            if attachments:
                for filename, content, mimetype in attachments:
                    email.attach(filename, content, mimetype)

            email.send(fail_silently=False)
            logger.info("Email '%s' sent successfully to '%s'.", subject, to)
            return True
        except Exception as exc:
            logger.error(
                "Failed to send email '%s' to '%s': %s",
                subject, to, exc,
                exc_info=True,
            )
            return False

    # -------------------------------------------------------------------------
    # Business-level email methods
    # -------------------------------------------------------------------------

    def send_participant_invitation_email(self, to_email: str, invitation_data: dict) -> bool:
        """
        Sends an invitation email to the participant's guardian.

        :param to_email: Recipient email address.
        :param invitation_data: Dict containing invitation_id, invited_by, expiry_date.
        :returns: True if the email was sent successfully, False otherwise.
        """
        template_name = 'participate_invitation_email'

        if not to_email:
            logger.error("Cannot send invitation email: recipient address is empty.")
            return False

        required_fields = ['invitation_id', 'invited_by', 'expiry_date']
        missing = [f for f in required_fields if f not in invitation_data]
        if missing:
            logger.error(
                "Cannot send invitation email to '%s': missing required fields: %s",
                to_email, missing
            )
            return False

        context = {
            '%invitationLink%': f"{settings.DASHBOARD_URL}/invitation/{invitation_data['invitation_id']}/accept",
            '%invitedBy%': invitation_data['invited_by'],
            '%expiryDate%': invitation_data['expiry_date'],
        }

        template = self.email_template_manager.get_email_template_by_name(template_name)
        if not template:
            logger.error(
                "Cannot send invitation email to '%s': template '%s' not found.",
                to_email, template_name
            )
            return False

        subject = template['subject']
        body = self.email_template_manager.generate_email_body_with_context(
            template['email_body'], context
        )

        return self._send_email(subject=subject, to=to_email, body=body)

    def send_test_email(self, to_email: str, config=None) -> bool:
        try:
            config_dict = DatabaseEmailConfigurationStrategy(config=config).get_config() if config else None
            connection = build_connection(config_dict) if config_dict else None
        except Exception as exc:
            logger.error("Failed to build SMTP connection for test email: %s", exc, exc_info=True)
            return False
        from_email = (config_dict or {}).get('from_email') or None
        subject = 'AYO Dashboard SMTP test'
        body = 'This is a test email confirming your SMTP configuration is working.'
        return self._send_email(
            subject=subject,
            to=to_email,
            body=body,
            from_email=from_email,
            connection=connection,
        )
