import logging

logger = logging.getLogger(__name__)

class EmailTemplateManager:

    def __init__(self):
        # Email templates with their subjects, body, and placeholders
        self.email_template = {
            'participate_invitation_email': {
                'subject': 'Invitation for Your Child to Join AYO LLM platform',
                'email_body': (
                    "Hello,\n\n"
                    "Thank you for completing the permission forms. Your family is now ready to participate in the study.\n\n"
                    "To proceed, please click this link to create an account on the AYO LLM platform.\n\n"
                    "%invitationLink%\n\n"
                    "A few things to keep in mind:\n"
                    "• Your family will not receive monetary compensation for this study. The child participating will have free access to the study platform for the full 6 weeks of their participation.\n"
                    "• Stopping study participation at any time is okay. If you decide that your family no longer wants to participate, please contact the research team or reply to this email.\n"
                    "• If you have any questions or experience any technical difficulties while interacting with this platform, please don't hesitate to reach out.\n\n"
                    "Please note that this invitation will expire on %expiryDate%. If you need a new link, please request a new one.\n\n"
                    "Thank you for contributing to our research.\n\n"
                    "Best regards,\n\n"
                    "AYO Research Team\n\n"
                    "KIDD LAB | Department of Psychology University of California, Berkeley | kiddlab.com"
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
