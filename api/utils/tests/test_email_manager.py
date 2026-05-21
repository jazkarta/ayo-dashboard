import pytest
from unittest.mock import MagicMock, patch
from django.conf import settings
from ..email_manager import EmailManager

class TestEmailManager:

    @pytest.fixture
    def email_manager(self):
        return EmailManager()

    def test_send_email_success(self, email_manager, mocker):
        """Test low-level _send_email success."""
        mock_email_message = mocker.patch("utils.email_manager.EmailMessage")
        
        subject = "Test Subject"
        to = "test@example.com"
        body = "Test Body"
        
        result = email_manager._send_email(subject, to, body)
        
        assert result is True
        mock_email_message.assert_called_once_with(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to]
        )
        mock_email_message.return_value.send.assert_called_once_with(fail_silently=False)

    def test_send_email_with_attachments(self, email_manager, mocker):
        """Test low-level _send_email with attachments."""
        mock_email_message = mocker.patch("utils.email_manager.EmailMessage")
        mock_instance = mock_email_message.return_value
        
        attachments = [("test.txt", "content", "text/plain")]
        email_manager._send_email("Subject", "test@example.com", "Body", attachments=attachments)
        
        mock_instance.attach.assert_called_once_with("test.txt", "content", "text/plain")

    def test_send_email_failure(self, email_manager, mocker):
        """Test low-level _send_email failure (exception)."""
        mock_email_message = mocker.patch("utils.email_manager.EmailMessage")
        mock_email_message.return_value.send.side_effect = Exception("SMTP Error")
        
        result = email_manager._send_email("Subject", "test@example.com", "Body")
        
        assert result is False

    @pytest.mark.parametrize("to_email, invitation_data, expected_result", [
        ("", {"invitation_id": "1", "invited_by": "B", "expiry_date": "C"}, False),
        ("test@example.com", {"invited_by": "B", "expiry_date": "C"}, False), # Missing invitation_id
    ])
    def test_send_participant_invitation_email_validation(self, email_manager, to_email, invitation_data, expected_result):
        """Test basic validation in send_participant_invitation_email."""
        result = email_manager.send_participant_invitation_email(to_email, invitation_data)
        assert result == expected_result

    def test_send_participant_invitation_email_full_flow(self, email_manager, mocker):
        """Test the complete success flow of send_participant_invitation_email."""
        # Mock EmailTemplateManager methods
        mock_template_manager = mocker.patch.object(email_manager, 'email_template_manager')
        mock_template_manager.get_email_template_by_name.return_value = {
            'subject': 'Invited!',
            'email_body': 'Invited by %invitedBy%, click %invitationLink%'
        }
        mock_template_manager.generate_email_body_with_context.return_value = "Invited by Dr. X, click http://link"

        # Mock _send_email
        mock_send = mocker.patch.object(email_manager, '_send_email', return_value=True)

        invitation_data = {
            'invitation_id': 'abc-123',
            'invited_by': 'Dr. X',
            'expiry_date': '2026-05-01'
        }
        
        result = email_manager.send_participant_invitation_email("parent@example.com", invitation_data)
        
        assert result is True
        mock_template_manager.get_email_template_by_name.assert_called_with('participate_invitation_email')
        mock_send.assert_called_once_with(
            subject='Invited!',
            to='parent@example.com',
            body='Invited by Dr. X, click http://link'
        )
