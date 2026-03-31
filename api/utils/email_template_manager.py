import logging

logger = logging.getLogger(__name__)

class EmailTemplateManager:

    def __init__(self):
        # Email templates with their subjects, body, and placeholders
        self.email_template = {
            'participate_invitation_email': {
                'subject': 'Your child has a new invitation',
                'email_body': (
                    "Hello,\n\n"
                    "Your child %participantName% has been invited by %invitedBy%.\n"
                    "Invitation link: %invitationLink%\n\n"
                    "Invitation expires on %expiryDate%.\n"
                    "Thank you."
                ),
                'templates': ['%invitationLink%', '%participantName%', '%invitedBy%', '%expiryDate%']
            }
        }

    def get_email_template_by_name(self, name):
        """
        Retrieves an email template by its name.
        """
        template = self.email_template.get(name)
        if not template:
            logger.error(f"Email template '{name}' not found.")
            return None
        return template

    def generate_email_body_with_context(self, email_body: str, context: dict) -> str:
        """
        Generates the email body by replacing placeholders in the template with context values.
        :param email_body: The body of the unrendered email template containing placeholders.
        :param context: A dictionary containing placeholder keys (without %%) and their replacement values.
        :return: Populated email body string or None if template not found.
        """

        # Replace each placeholder with the value from context
        # Placeholders in email_body are expected to be in the format %key%
        for key, value in context.items():
            email_body = email_body.replace(key, str(value))
            
        return email_body
