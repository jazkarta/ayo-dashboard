import pytest
from django.urls import reverse
from rest_framework import status
from participant.models import Invitation, ParticipantProfile, Guardian
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

@pytest.mark.django_db
class TestInvitationRetrieve:
    def test_retrieve_invitation_success(self, api_client, invitation):
        url = reverse('invitation-detail', kwargs={'pk': invitation.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(invitation.id)
        assert response.data['parent_email'] == invitation.parent_email

    def test_retrieve_invitation_not_found(self, api_client):
        url = reverse('invitation-detail', kwargs={'pk': '00000000-0000-0000-0000-000000000000'})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
class TestInvitationAccept:
    
    @pytest.fixture
    def valid_payload(self):
        return {
            "username": "new_participant_user"
        }

    def test_accept_invitation_success(self, api_client, invitation, valid_payload, mock_keycloak):
        # Setup mock behavior
        mock_keycloak.create_user.return_value = "fake-keycloak-uuid"
        
        url = reverse('invitation-accept', kwargs={'pk': invitation.id})
        response = api_client.post(url, valid_payload)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify invitation status
        invitation.refresh_from_db()
        assert invitation.has_accepted is True
        assert invitation.is_active is False
        
        # Verify user status
        user = invitation.user
        user.refresh_from_db()
        assert user.is_active is True
        assert user.username == "new_participant_user"
        assert user.keycloak_id == "fake-keycloak-uuid"

    @pytest.mark.parametrize("scenario, invitation_fixture, payload_overrides, expected_status, error_key", [
        ("already_accepted", "accepted_invitation", {}, status.HTTP_400_BAD_REQUEST, "non_field_errors"),
        ("expired", "expired_invitation", {}, status.HTTP_400_BAD_REQUEST, "non_field_errors"),
        ("duplicate_username", "invitation", {"username": "regular_user"}, status.HTTP_400_BAD_REQUEST, "username"),
    ])
    def test_accept_invitation_failures(self, api_client, scenario, invitation_fixture, payload_overrides, expected_status, error_key, request, valid_payload, regular_user):
        invitation = request.getfixturevalue(invitation_fixture)
        payload = {**valid_payload, **payload_overrides}
        
        url = reverse('invitation-accept', kwargs={'pk': invitation.id})
        response = api_client.post(url, payload)
        
        assert response.status_code == expected_status
        assert error_key in response.data
