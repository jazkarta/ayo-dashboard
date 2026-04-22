"""
Comprehensive test suite for the ResearcherViewSet.

Covers:
  - Create (valid + validation errors + Keycloak integration)
  - Update (PATCH / PUT)
  - Delete (hard)
  - Deactivate (soft, with Keycloak)
  - List & Retrieve
  - Permissions (admin, researcher, participant, anonymous)
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

from users.models.user import UserRole

User = get_user_model()

BASE_URL = "/api/researchers/"


def detail_url(pk):
    return f"{BASE_URL}{pk}/"


def deactivate_url(pk):
    return f"{BASE_URL}{pk}/deactivate/"


# ===========================================================================
# TestResearcherCreate
# ===========================================================================

@pytest.mark.django_db
class TestResearcherCreate:

    @pytest.mark.parametrize("payload,expected_status", [
        # Valid creation
        (
            {"email": "new@example.com", "first_name": "John", "last_name": "Doe"},
            status.HTTP_201_CREATED,
        ),
        # Email normalised to lowercase
        (
            {"email": "UPPER@EXAMPLE.COM", "first_name": "Jane", "last_name": "Smith"},
            status.HTTP_201_CREATED,
        ),
    ])
    def test_create_valid(self, admin_client, mock_keycloak, payload, expected_status):
        response = admin_client.post(BASE_URL, payload, format="json")
        assert response.status_code == expected_status

    def test_create_stores_keycloak_id(self, admin_client, mock_keycloak):
        """The keycloak_id returned by KeycloakSync must be persisted on the user."""
        mock_keycloak.create_user.return_value = "kc-abc-123"
        payload = {"email": "kc@example.com", "first_name": "KC", "last_name": "Test"}
        response = admin_client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="kc@example.com")
        assert user.keycloak_id == "kc-abc-123"

    def test_create_keycloak_called_with_researcher_role(self, admin_client, mock_keycloak):
        """KeycloakSync.create_user must be called with role='researchers'."""
        payload = {"email": "role@example.com", "first_name": "Role", "last_name": "Test"}
        admin_client.post(BASE_URL, payload, format="json")
        call_kwargs = mock_keycloak.create_user.call_args
        assert call_kwargs.kwargs.get("role") == UserRole.RESEARCHER  # 'researchers'

    def test_create_user_is_active(self, admin_client, mock_keycloak):
        """Newly created researchers must be immediately active."""
        payload = {"email": "active@example.com", "first_name": "Active", "last_name": "User"}
        admin_client.post(BASE_URL, payload, format="json")
        user = User.objects.get(email="active@example.com")
        assert user.is_active is True

    def test_create_user_role_is_researcher(self, admin_client, mock_keycloak):
        """Newly created users must have role=RESEARCHER."""
        payload = {"email": "roles@example.com", "first_name": "R", "last_name": "S"}
        admin_client.post(BASE_URL, payload, format="json")
        user = User.objects.get(email="roles@example.com")
        assert user.role == UserRole.RESEARCHER

    @pytest.mark.parametrize("payload,missing_field", [
        ({"first_name": "John", "last_name": "Doe"}, "email"),
        ({"email": "x@example.com", "last_name": "Doe"}, "first_name"),
        ({"email": "x@example.com", "first_name": "John"}, "last_name"),
        ({"email": "", "first_name": "John", "last_name": "Doe"}, "email"),
        ({"email": "x@example.com", "first_name": "", "last_name": "Doe"}, "first_name"),
        ({"email": "x@example.com", "first_name": "John", "last_name": ""}, "last_name"),
    ])
    def test_create_missing_required_field(
        self, admin_client, mock_keycloak, payload, missing_field
    ):
        response = admin_client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert missing_field in response.data

    def test_create_invalid_email_format(self, admin_client, mock_keycloak):
        payload = {"email": "not-an-email", "first_name": "John", "last_name": "Doe"}
        response = admin_client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    def test_create_duplicate_email(self, admin_client, mock_keycloak, researcher_user):
        """Duplicate emails (case-insensitive) must be rejected with 400."""
        payload = {
            "email": researcher_user.email.upper(),
            "first_name": "Dup",
            "last_name": "User",
        }
        response = admin_client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    def test_create_keycloak_failure_rolls_back_db(self, admin_client, mock_keycloak):
        """If Keycloak raises, the transaction must be rolled back (no orphan user)."""
        from keycloak.exceptions import KeycloakError
        mock_keycloak.create_user.side_effect = KeycloakError("KC error")
        payload = {"email": "rollback@example.com", "first_name": "Roll", "last_name": "Back"}
        # Disable re-raising exceptions so we can assert on the 500 status code
        admin_client.raise_request_exception = False
        response = admin_client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert not User.objects.filter(email="rollback@example.com").exists()

    def test_create_by_researcher_allowed(self, researcher_client, mock_keycloak):
        """Researchers (not just admins) should be able to create researchers."""
        payload = {"email": "byresearcher@example.com", "first_name": "By", "last_name": "Researcher"}
        response = researcher_client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED


# ===========================================================================
# TestResearcherUpdate
# ===========================================================================

@pytest.mark.django_db
class TestResearcherUpdate:

    def test_patch_first_name(self, admin_client, mock_keycloak, researcher_user):
        response = admin_client.patch(
            detail_url(researcher_user.pk),
            {"first_name": "NewFirst"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        researcher_user.refresh_from_db()
        assert researcher_user.first_name == "NewFirst"

    def test_patch_last_name(self, admin_client, mock_keycloak, researcher_user):
        response = admin_client.patch(
            detail_url(researcher_user.pk),
            {"last_name": "NewLast"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        researcher_user.refresh_from_db()
        assert researcher_user.last_name == "NewLast"

    def test_put_updates_both_name_fields(self, admin_client, mock_keycloak, researcher_user):
        response = admin_client.put(
            detail_url(researcher_user.pk),
            {"first_name": "PutFirst", "last_name": "PutLast"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        researcher_user.refresh_from_db()
        assert researcher_user.first_name == "PutFirst"
        assert researcher_user.last_name == "PutLast"

    def test_keycloak_update_user_called_on_patch(self, admin_client, mock_keycloak, researcher_user):
        admin_client.patch(
            detail_url(researcher_user.pk),
            {"first_name": "Updated"},
            format="json",
        )
        mock_keycloak.update_user.assert_called_once()
        call_kwargs = mock_keycloak.update_user.call_args.kwargs
        assert call_kwargs["keycloak_id"] == researcher_user.keycloak_id
        assert call_kwargs["first_name"] == "Updated"

    def test_update_nonexistent_researcher(self, admin_client, mock_keycloak):
        response = admin_client.patch(
            detail_url(99999),
            {"first_name": "Ghost"},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ===========================================================================
# TestResearcherDelete
# ===========================================================================

@pytest.mark.django_db
class TestResearcherDelete:

    def test_delete_removes_researcher(self, admin_client, researcher_user):
        """DELETE should remove the user from Django (signal handles Keycloak)."""
        # Signals are mocked in conftest.py
        pk = researcher_user.pk
        response = admin_client.delete(detail_url(pk))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not User.objects.filter(pk=pk).exists()

    def test_delete_nonexistent_researcher(self, admin_client):
        response = admin_client.delete(detail_url(99999))
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ===========================================================================
# TestResearcherDeactivate
# ===========================================================================

@pytest.mark.django_db
class TestResearcherDeactivate:

    def test_deactivate_sets_is_active_false(self, admin_client, mock_keycloak, researcher_user):
        response = admin_client.post(deactivate_url(researcher_user.pk))
        assert response.status_code == status.HTTP_200_OK
        researcher_user.refresh_from_db()
        assert researcher_user.is_active is False

    def test_deactivate_calls_keycloak_with_enabled_false(
        self, admin_client, mock_signal_keycloak, researcher_user
    ):
        admin_client.post(deactivate_url(researcher_user.pk))
        instance = mock_signal_keycloak.return_value
        instance.update_user.assert_called_once()
        call_kwargs = instance.update_user.call_args.kwargs
        assert call_kwargs["keycloak_id"] == researcher_user.keycloak_id
        assert call_kwargs["enabled"] is False

    def test_deactivate_response_contains_is_active_false(
        self, admin_client, mock_keycloak, researcher_user
    ):
        response = admin_client.post(deactivate_url(researcher_user.pk))
        assert response.data["is_active"] is False

    def test_deactivate_already_inactive_returns_400(
        self, admin_client, mock_keycloak, inactive_researcher
    ):
        response = admin_client.post(deactivate_url(inactive_researcher.pk))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_deactivate_nonexistent_researcher(self, admin_client):
        response = admin_client.post(deactivate_url(99999))
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ===========================================================================
# TestResearcherList
# ===========================================================================

@pytest.mark.django_db
class TestResearcherList:

    def test_list_returns_only_researchers(
        self, admin_client, researcher_user, participant_user
    ):
        response = admin_client.get(BASE_URL)
        assert response.status_code == status.HTTP_200_OK
        emails = [r["email"] for r in response.data["results"]]
        assert researcher_user.email in emails
        assert participant_user.email not in emails

    def test_list_returns_all_researchers(self, admin_client, db):
        """All researchers in the DB should appear in the list."""
        User.objects.create_user(
            email="r1@example.com", role=UserRole.RESEARCHER, is_active=True
        )
        User.objects.create_user(
            email="r2@example.com", role=UserRole.RESEARCHER, is_active=True
        )
        response = admin_client.get(BASE_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 2

    def test_list_response_fields(self, admin_client, researcher_user):
        response = admin_client.get(BASE_URL)
        assert response.status_code == status.HTTP_200_OK
        result = response.data["results"][0]
        for field in ("id", "email", "first_name", "last_name", "is_active", "role"):
            assert field in result


# ===========================================================================
# TestResearcherListFiltering
# ===========================================================================

@pytest.mark.django_db
class TestResearcherListFiltering:

    @pytest.fixture
    def multiple_researchers(self, db):
        User.objects.create_user(
            email="active@example.com", first_name="Active", last_name="User",
            role=UserRole.RESEARCHER, is_active=True
        )
        User.objects.create_user(
            email="inactive@example.com", first_name="Inactive", last_name="User",
            role=UserRole.RESEARCHER, is_active=False
        )
        User.objects.create_user(
            email="search@example.com", first_name="UniqueName", last_name="Researcher",
            role=UserRole.RESEARCHER, is_active=True
        )

    def test_filter_by_is_active_true(self, admin_client, multiple_researchers):
        response = admin_client.get(f"{BASE_URL}?is_active=true")
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert len(results) >= 2
        for r in results:
            assert r["is_active"] is True

    def test_filter_by_is_active_false(self, admin_client, multiple_researchers):
        response = admin_client.get(f"{BASE_URL}?is_active=false")
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        # Should be at least the one we just created
        assert any(r["email"] == "inactive@example.com" for r in results)
        for r in results:
            assert r["is_active"] is False

    def test_search_by_email(self, admin_client, multiple_researchers):
        response = admin_client.get(f"{BASE_URL}?search=search@example.com")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["email"] == "search@example.com"

    def test_search_by_first_name(self, admin_client, multiple_researchers):
        response = admin_client.get(f"{BASE_URL}?search=UniqueName")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["first_name"] == "UniqueName"

    def test_search_partial_match(self, admin_client, multiple_researchers):
        response = admin_client.get(f"{BASE_URL}?search=Unique")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["first_name"] == "UniqueName"


# ===========================================================================
# TestResearcherRetrieve
# ===========================================================================

@pytest.mark.django_db
class TestResearcherRetrieve:

    def test_retrieve_returns_correct_researcher(self, admin_client, researcher_user):
        response = admin_client.get(detail_url(researcher_user.pk))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == researcher_user.email
        assert response.data["first_name"] == researcher_user.first_name

    def test_retrieve_nonexistent_returns_404(self, admin_client):
        response = admin_client.get(detail_url(99999))
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ===========================================================================
# TestResearcherPermissions
# ===========================================================================

@pytest.mark.django_db
class TestResearcherPermissions:

    @pytest.mark.parametrize("action_fn,method,payload", [
        (lambda: BASE_URL, "get", None),
        (lambda: BASE_URL, "post", {"email": "p@x.com", "first_name": "P", "last_name": "Q"}),
    ])
    def test_anonymous_denied(self, api_client, action_fn, method, payload):
        fn = getattr(api_client, method)
        response = fn(action_fn(), payload or {}, format="json") if payload else fn(action_fn())
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_participant_denied_list(self, participant_client):
        response = participant_client.get(BASE_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_participant_denied_create(self, participant_client, mock_keycloak):
        payload = {"email": "denied@example.com", "first_name": "D", "last_name": "E"}
        response = participant_client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_allowed_list(self, admin_client):
        response = admin_client.get(BASE_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_researcher_allowed_list(self, researcher_client):
        response = researcher_client.get(BASE_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_researcher_allowed_create(self, researcher_client, mock_keycloak):
        payload = {"email": "newbyrc@example.com", "first_name": "New", "last_name": "RC"}
        response = researcher_client.post(BASE_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
