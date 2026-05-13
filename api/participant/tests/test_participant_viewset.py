import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from users.models.user import UserRole
from participant.models import Invitation
from django.utils import timezone
from datetime import timedelta

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
                "family_id": "FAM001",
                "demographics": "Some demographic info"
            }
        }, status.HTTP_201_CREATED),
        # Case 2: Non-researcher tries to create participant
        ("regular_user", {
            "email": "should_fail@example.com",
            "first_name": "Fail",
            "last_name": "Fail",
            "profile_data": {"date_of_birth": "2010-01-01", "gender": "F", "family_id": "FAM002"}
        }, status.HTTP_403_FORBIDDEN),
        # Case 3: Invalid data (future DOB)
        ("researcher_user", {
            "email": "invalid@example.com",
            "first_name": "Invalid",
            "last_name": "DOB",
            "profile_data": {
                "date_of_birth": "2030-01-01",
                "gender": "M",
                "family_id": "FAM003"
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

    def test_create_participant_with_cohort(self, api_client, researcher_user, cohort):
        api_client.force_authenticate(user=researcher_user)
        payload = {
            "email": "cohort_participant@example.com",
            "first_name": "Cohort",
            "last_name": "Member",
            "profile_data": {
                "date_of_birth": "2010-01-01",
                "gender": "M",
                "family_id": "FAM010",
                "cohort_id": str(cohort.id),
            },
        }
        response = api_client.post(reverse("participant-list"), payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["profile_data"]["cohort"]["id"] == str(cohort.id)

    def test_update_participant_cohort(self, api_client, researcher_user, participant_user, cohort):
        api_client.force_authenticate(user=researcher_user)
        url = reverse("participant-detail", kwargs={"pk": participant_user.pk})
        response = api_client.patch(
            url,
            {"profile_data": {"cohort_id": str(cohort.id)}},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["profile_data"]["cohort"]["id"] == str(cohort.id)

    @pytest.mark.parametrize(
        "initial_email, duplicate_email",
        [
            ("new_participant@example.com", "New_Participant@Example.com"),
            ("testuser@example.com", "TESTUSER@example.com"),
            ("user@example.com", "User@Example.com"),
            ("user@example.com", "User@Example.com "),
            ("user@example.com", "user@example.com"),
            ("User@example.com", "user@example.com"),
        ]
    )
    def test_create_participant_duplicate_email_case_insensitive(
            self, api_client, researcher_user, initial_email, duplicate_email
    ):
        """Test that creating a participant with the same email (different casing) fails
        Also ensures emails are normalized to lowercase before validation.
        """
        api_client.force_authenticate(user=researcher_user)
        url = reverse("participant-list")

        # Create initial participant
        payload1 = {
            "email": initial_email,
            "first_name": "Original",
            "last_name": "User",
            "profile_data": {
                "date_of_birth": "2010-01-01",
                "gender": "M",
                "family_id": "FAM001",
                "demographics": "Info"
            }
        }
        response1 = api_client.post(url, payload1, format="json")
        assert response1.status_code == status.HTTP_201_CREATED

        # Attempt duplicate email with different cases
        payload2 = {
            "email": duplicate_email,
            "first_name": "Duplicate",
            "last_name": "User",
            "profile_data": {
                "date_of_birth": "2010-01-01",
                "gender": "M",
                "family_id": "FAM002",
                "demographics": "Info"
            }
        }
        response2 = api_client.post(url, payload2, format="json")
        assert response2.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response2.data

    def test_invite_participant(self, api_client, researcher_user, participant_user, mock_email_manager):
        """Test inviting an inactive participant."""
        api_client.force_authenticate(user=researcher_user)
        
        url = reverse("participant-invite", kwargs={"pk": participant_user.pk})
        payload = {"email": "guardian@example.com"}

        # print(f"")
        
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

    @pytest.mark.parametrize("invited_by_user", [True, False])
    def test_list_participants_filtered_by_logged_in_user(
            self, api_client, researcher_user, participant_user, invited_by_user
    ):
        """
        Test that the list endpoint only returns participants invited by the logged-in researcher.
        """

        participant_1 = User.objects.create_user(
            email="p1@example.com", password="password123", role=UserRole.PARTICIPANT
        )
        participant_2 = User.objects.create_user(
            email="p2@example.com", password="password123", role=UserRole.PARTICIPANT
        )

        expiry = timezone.now() + timedelta(days=7)

        if invited_by_user:
            Invitation.objects.create(user=participant_1, invited_by=researcher_user, expiry_date=expiry)
            Invitation.objects.create(user=participant_2, invited_by=researcher_user, expiry_date=expiry)
            expected_ids = [participant_1.id, participant_2.id]
        else:
            other_researcher = User.objects.create_user(
                email="other@example.com",
                password="password123",
                role=UserRole.RESEARCHER
            )
            Invitation.objects.create(user=participant_1, invited_by=other_researcher, expiry_date=expiry)
            Invitation.objects.create(user=participant_2, invited_by=other_researcher, expiry_date=expiry)
            expected_ids = []

        api_client.force_authenticate(user=researcher_user)
        url = reverse("participant-list")
        response = api_client.get(url, format="json")

        assert response.status_code == 200

        # Handle pagination if present
        if isinstance(response.data, dict) and "results" in response.data:
            returned_ids = [p["id"] for p in response.data["results"]]
        else:
            returned_ids = [p["id"] for p in response.data]

        print(f"\nInvited: {invited_by_user}")
        print(f"Expected IDs: {expected_ids}")
        print(f"Returned IDs: {returned_ids}")

        assert set(returned_ids) == set(expected_ids), f"Expected IDs {expected_ids}, but got {returned_ids}"

    @pytest.mark.parametrize("filter_value, expected_count", [
        ("true", 1),
        ("false", 2),
    ])
    def test_filter_by_is_active(self, api_client, researcher_user, filter_value, expected_count):
        expiry = timezone.now() + timedelta(days=7)

        active = User.objects.create_user(email="active@example.com", role=UserRole.PARTICIPANT, is_active=True)
        inactive1 = User.objects.create_user(email="inactive1@example.com", role=UserRole.PARTICIPANT, is_active=False)
        inactive2 = User.objects.create_user(email="inactive2@example.com", role=UserRole.PARTICIPANT, is_active=False)

        for user in [active, inactive1, inactive2]:
            Invitation.objects.create(user=user, invited_by=researcher_user, expiry_date=expiry)

        api_client.force_authenticate(user=researcher_user)
        response = api_client.get(reverse("participant-list"), {"is_active": filter_value})

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"] if "results" in response.data else response.data
        assert len(results) == expected_count

    @pytest.mark.parametrize("search_term, expected_emails", [
        ("Alice", ["alice@example.com"]),
        ("Smith", ["bob@example.com"]),
        ("charlie@example.com", ["charlie@example.com"]),
        ("notfound", []),
    ])
    def test_search_participants(self, api_client, researcher_user, search_term, expected_emails):
        expiry = timezone.now() + timedelta(days=7)

        alice = User.objects.create_user(email="alice@example.com", first_name="Alice", last_name="Jones", role=UserRole.PARTICIPANT)
        bob = User.objects.create_user(email="bob@example.com", first_name="Bob", last_name="Smith", role=UserRole.PARTICIPANT)
        charlie = User.objects.create_user(email="charlie@example.com", first_name="Charlie", last_name="Brown", role=UserRole.PARTICIPANT)

        for user in [alice, bob, charlie]:
            Invitation.objects.create(user=user, invited_by=researcher_user, expiry_date=expiry)

        api_client.force_authenticate(user=researcher_user)
        response = api_client.get(reverse("participant-list"), {"search": search_term})

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"] if "results" in response.data else response.data
        assert set(p["email"] for p in results) == set(expected_emails)

    @pytest.mark.parametrize("ordering, key, expected_order", [
        ("first_name", "first_name", ["Alice", "Bob", "Charlie"]),
        ("-first_name", "first_name", ["Charlie", "Bob", "Alice"]),
        ("email", "email", ["alice@example.com", "bob@example.com", "charlie@example.com"]),
        ("-email", "email", ["charlie@example.com", "bob@example.com", "alice@example.com"]),
    ])
    def test_ordering_participants(self, api_client, researcher_user, ordering, key, expected_order):
        expiry = timezone.now() + timedelta(days=7)

        charlie = User.objects.create_user(email="charlie@example.com", first_name="Charlie", last_name="Brown", role=UserRole.PARTICIPANT)
        alice = User.objects.create_user(email="alice@example.com", first_name="Alice", last_name="Jones", role=UserRole.PARTICIPANT)
        bob = User.objects.create_user(email="bob@example.com", first_name="Bob", last_name="Smith", role=UserRole.PARTICIPANT)

        for user in [charlie, alice, bob]:
            Invitation.objects.create(user=user, invited_by=researcher_user, expiry_date=expiry)

        api_client.force_authenticate(user=researcher_user)
        response = api_client.get(reverse("participant-list"), {"ordering": ordering})

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"] if "results" in response.data else response.data
        assert [p[key] for p in results] == expected_order
