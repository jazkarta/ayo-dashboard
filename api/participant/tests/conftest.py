import pytest
from unittest.mock import MagicMock
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from users.models.user import UserRole
from model_bakery import baker

User = get_user_model()


@pytest.fixture(autouse=True)
def mock_signal_keycloak(mocker):
    mock_cls = mocker.patch("users.signals.KeycloakSync")
    mock_cls.return_value = MagicMock()
    return mock_cls


@pytest.fixture(autouse=True)
def mock_signal_librechat(mocker):
    mock_cls = mocker.patch("users.signals.LibreChatSync")
    mock_cls.return_value = MagicMock()
    return mock_cls

@pytest.fixture
def researcher_user(db):
    """Fixture to create and return a user with RESEARCHER role."""
    return User.objects.create_user(
        email="researcher@example.com",
        password="password123",
        role=UserRole.RESEARCHER,
        first_name="Research",
        last_name="er"
    )

@pytest.fixture
def participant_user(db):
    """Fixture to create and return an inactive user with PARTICIPANT role and profile."""
    user = User.objects.create_user(
        email="participant@example.com",
        username="participant",
        password="password123",
        role=UserRole.PARTICIPANT,
        is_active=False,
        first_name="Parti",
        last_name="cipant"
    )
    from participant.models import ParticipantProfile
    ParticipantProfile.objects.get_or_create(
        user=user,
        defaults={
            "date_of_birth": "2010-01-01",
            "gender": "M"
        }
    )
    return user

@pytest.fixture
def regular_user(db):
    """Fixture to create and return a regular user (defaults to PARTICIPANT but active)."""
    user = User.objects.create_user(
        email="user@example.com",
        username="regular_user",
        password="password123",
        role=UserRole.PARTICIPANT,
        is_active=True
    )
    from participant.models import ParticipantProfile
    ParticipantProfile.objects.get_or_create(
        user=user,
        defaults={
            "date_of_birth": "2010-01-01",
            "gender": "M"
        }
    )
    return user

@pytest.fixture
def invitation(participant_user, researcher_user):
    """Fixture for a valid, active invitation."""
    from participant.models import Invitation
    from django.utils import timezone
    from datetime import timedelta
    return Invitation.objects.create(
        user=participant_user,
        invited_by=researcher_user,
        parent_email="guardian@example.com",
        expiry_date=timezone.now() + timedelta(days=2),
        is_active=True,
        has_accepted=False
    )

@pytest.fixture
def expired_invitation(db, researcher_user):
    """Fixture for an expired invitation."""
    from participant.models import Invitation
    from django.utils import timezone
    from datetime import timedelta
    
    user = User.objects.create_user(
        email="expired@example.com",
        username="expired",
        role=UserRole.PARTICIPANT,
        is_active=False
    )
    from participant.models import ParticipantProfile
    ParticipantProfile.objects.create(user=user, date_of_birth="2010-01-01", gender="M")

    return Invitation.objects.create(
        user=user,
        invited_by=researcher_user,
        parent_email="guardian@example.com",
        expiry_date=timezone.now() - timedelta(days=1),
        is_active=True,
        has_accepted=False
    )

@pytest.fixture
def accepted_invitation(db, researcher_user):
    """Fixture for an already accepted invitation."""
    from participant.models import Invitation
    from django.utils import timezone
    from datetime import timedelta
    
    user = User.objects.create_user(
        email="accepted@example.com",
        username="accepted",
        role=UserRole.PARTICIPANT,
        is_active=False
    )
    from participant.models import ParticipantProfile
    ParticipantProfile.objects.create(user=user, date_of_birth="2010-01-01", gender="M")

    return Invitation.objects.create(
        user=user,
        invited_by=researcher_user,
        parent_email="guardian@example.com",
        expiry_date=timezone.now() + timedelta(days=2),
        is_active=True,
        has_accepted=True
    )

@pytest.fixture
def mock_email_manager(mocker):
    """Fixture to mock EmailManager."""
    mock_email = mocker.patch("participant.serializers.EmailManager")
    return mock_email.return_value

@pytest.fixture
def api_client():
    """Fixture to provide a DRF APIClient."""
    return APIClient()

@pytest.fixture
def mock_keycloak(mocker):
    """Fixture to mock KeycloakSync."""
    mock_sync = mocker.patch("participant.serializers.KeycloakSync")
    return mock_sync.return_value
