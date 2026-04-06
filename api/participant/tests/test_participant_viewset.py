import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from users.models.user import UserRole
from participant.models import Invitation

User = get_user_model()

@pytest.mark.django_db
class TestParticipantViewSet:

    @pytest.mark.parametrize("user_fixture, payload, expected_status", [
        # Case 1: Researcher creates participant with valid data
        ("researcher_user", {
            "email": "new_participant@example.com",
            "first_name": "New",
            "last_name": "Participant",
            "profile_data": {
                "date_of_birth": "2010-01-01",
                "gender": "M",
                "demographics": "Some demographic info"
            }
        }, status.HTTP_201_CREATED),
        # Case 2: Non-researcher tries to create participant
        ("regular_user", {
            "email": "should_fail@example.com",
            "first_name": "Fail",
            "last_name": "Fail",
            "profile_data": {"date_of_birth": "2010-01-01", "gender": "F"}
        }, status.HTTP_403_FORBIDDEN),
        # Case 3: Invalid data (future DOB)
        ("researcher_user", {
            "email": "invalid@example.com",
            "first_name": "Invalid",
            "last_name": "DOB",
            "profile_data": {
                "date_of_birth": "2030-01-01",
                "gender": "M"
            }
        }, status.HTTP_400_BAD_REQUEST),
    ])
    def test_create_participant(self, api_client, request, user_fixture, payload, expected_status):
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user=user)
        
        url = reverse("participant-list")
        response = api_client.post(url, payload, format="json")
        
        assert response.status_code == expected_status, f"Response: {response.data}"
        if expected_status == status.HTTP_201_CREATED:
            assert User.objects.filter(email=payload["email"]).exists()
            new_user = User.objects.get(email=payload["email"])
            assert new_user.role == UserRole.PARTICIPANT
            assert not new_user.is_active

    def test_invite_participant(self, api_client, researcher_user, participant_user, mock_email_manager):
        """Test inviting an inactive participant."""
        api_client.force_authenticate(user=researcher_user)
        
        url = reverse("participant-invite", kwargs={"pk": participant_user.pk})
        payload = {"email": "guardian@example.com"}
        
        response = api_client.post(url, payload, format="json")
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Invitation.objects.filter(user=participant_user).exists()
        
        # Verify email was "sent" (mock called)
        assert mock_email_manager.send_participant_invitation_email.called

    @pytest.mark.parametrize("email, is_taken, expected_status", [
        ("new_email@example.com", False, status.HTTP_200_OK),
        ("taken@example.com", True, status.HTTP_400_BAD_REQUEST),
    ])
    def test_check_email(self, api_client, researcher_user, email, is_taken, expected_status):
        """Test the email availability check endpoint."""
        api_client.force_authenticate(user=researcher_user)
        
        if is_taken:
            User.objects.create_user(email=email, password="password123")
            
        url = reverse("participant-check-email")
        response = api_client.get(url, {"email": email})
        
        assert response.status_code == expected_status
        if expected_status == status.HTTP_200_OK:
            assert response.data["detail"] == "Email is available"
