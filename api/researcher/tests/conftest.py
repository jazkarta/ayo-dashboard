import pytest
from unittest.mock import MagicMock
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from users.models.user import UserRole

User = get_user_model()


# ---------------------------------------------------------------------------
# User fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def admin_user(db):
    """An is_staff=True admin user (not a researcher)."""
    return User.objects.create_user(
        email="admin@example.com",
        password="adminpass123",
        first_name="Admin",
        last_name="User",
        is_staff=True,
        is_active=True,
    )


@pytest.fixture
def researcher_user(db):
    """An active researcher with a fake keycloak_id."""
    return User.objects.create_user(
        email="researcher@example.com",
        password="researchpass123",
        first_name="Alice",
        last_name="Research",
        role=UserRole.RESEARCHER,
        is_active=True,
        keycloak_id="fake-kc-id-researcher",
    )


@pytest.fixture
def inactive_researcher(db):
    """An already-deactivated researcher."""
    return User.objects.create_user(
        email="inactive.researcher@example.com",
        password="pass123",
        first_name="Bob",
        last_name="Inactive",
        role=UserRole.RESEARCHER,
        is_active=False,
        keycloak_id="fake-kc-id-inactive",
    )


@pytest.fixture
def participant_user(db):
    """An active participant (should be denied access to researcher endpoints)."""
    return User.objects.create_user(
        email="participant@example.com",
        password="participantpass",
        role=UserRole.PARTICIPANT,
        is_active=True,
    )


@pytest.fixture
def researcher_admin_user(db):
    """A researcher who is also a Django admin (role=RESEARCHER and is_staff=True)."""
    return User.objects.create_user(
        email="researcher.admin@example.com",
        password="researchadminpass123",
        first_name="Rachel",
        last_name="AdminResearch",
        role=UserRole.RESEARCHER,
        is_active=True,
        is_staff=True,
        keycloak_id="fake-kc-id-researcher-admin",
    )


# ---------------------------------------------------------------------------
# API client fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    """Unauthenticated DRF APIClient."""
    return APIClient()


@pytest.fixture
def admin_client(admin_user):
    """APIClient authenticated as an admin."""
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def researcher_client(researcher_user):
    """APIClient authenticated as an active researcher."""
    client = APIClient()
    client.force_authenticate(user=researcher_user)
    return client


@pytest.fixture
def participant_client(participant_user):
    """APIClient authenticated as a participant (insufficient permissions)."""
    client = APIClient()
    client.force_authenticate(user=participant_user)
    return client


@pytest.fixture
def researcher_admin_client(researcher_admin_user):
    """APIClient authenticated as a researcher who is also a Django admin."""
    client = APIClient()
    client.force_authenticate(user=researcher_admin_user)
    return client


# ---------------------------------------------------------------------------
# Always-on signal mocks — prevent real Keycloak/LibreChat calls from
# post_save / post_delete signals whenever any model.save() / delete()
# fires inside a test.
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def mock_signal_keycloak(mocker):
    """Patch KeycloakSync used by users.signals so signals never make real calls."""
    mock_cls = mocker.patch("users.signals.KeycloakSync")
    mock_cls.return_value = MagicMock()
    return mock_cls


@pytest.fixture(autouse=True)
def mock_signal_librechat(mocker):
    """Patch LibreChatSync used by users.signals."""
    mock_cls = mocker.patch("users.signals.LibreChatSync")
    mock_cls.return_value = MagicMock()
    return mock_cls


# ---------------------------------------------------------------------------
# Explicit serializer-level mock fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_keycloak(mocker):
    """
    Patch KeycloakSync everywhere it is used inside the researcher serializers.
    Returns the mock *instance* (i.e. mock_keycloak.create_user, etc.).
    """
    mock_cls = mocker.patch("researcher.serializers.KeycloakSync")
    instance = mock_cls.return_value
    instance.create_user.return_value = "fake-kc-id-new"
    return instance
