import pytest
from ..email_template_manager import EmailTemplateManager

class TestEmailTemplateManager:

    @pytest.fixture
    def manager(self):
        return EmailTemplateManager()

    def test_get_email_template_by_name_success(self, manager):
        """Test retrieving an existing template."""
        template_name = 'participate_invitation_email'
        template = manager.get_email_template_by_name(template_name)
        
        assert template is not None
        assert 'subject' in template
        assert 'email_body' in template
        assert template['subject'] == 'Invitation for Your Child to Join AYO LLM platform'

    def test_get_email_template_by_name_not_found(self, manager):
        """Test retrieving a non-existent template returns None."""
        template = manager.get_email_template_by_name('non_existent_template')
        assert template is None

    @pytest.mark.parametrize("context,expected_snippet", [
        (
            {
                '%invitationLink%': 'http://example.com/join',
                '%expiryDate%': '2026-12-31'
            },
            "Please note that this invitation will expire on 2026-12-31."
        ),
        (
            {
                '%invitationLink%': 'http://example.com/jane',
                '%expiryDate%': '2026-06-30'
            },
            "Please note that this invitation will expire on 2026-06-30."
        )
    ])
    def test_generate_email_body_with_context(self, manager, context, expected_snippet):
        """Test replacing placeholders in the email body."""
        template = manager.get_email_template_by_name('participate_invitation_email')
        body = manager.generate_email_body_with_context(template['email_body'], context)
        
        assert expected_snippet in body
        assert context['%invitationLink%'] in body
        assert context['%expiryDate%'] in body
        assert '%invitationLink%' not in body
        assert '%expiryDate%' not in body
