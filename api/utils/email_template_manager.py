import logging

logger = logging.getLogger(__name__)

class EmailTemplateManager:

    def __init__(self):
        # Email templates with their subjects, body, and placeholders
        self.email_template = {
            'participate_invitation_email': {
                'subject': 'Invitation for Your Child to Join AYO Platform',
                'email_body': (
                    "Dear Guardian,\n\n"
                    "I hope you are doing well.\n\n"
                    "Your child %participantName% has been invited by a researcher, %invitedBy%, to join the AYO platform. "
                    "AYO is an AI-powered chat platform where participants can interact with AI as part of platform activities.\n\n"
                    "To proceed, please review the invitation and provide your consent using the link below:\n"
                    "%invitationLink%\n\n"
                    "Please note that this invitation will expire on %expiryDate%.\n\n"
                    "If you have any questions, feel free to reach out.\n\n"
                    "Thank you for your time and consideration.\n\n"
                    "Sincerely,\n"
                    "AYO Platform Team"
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
