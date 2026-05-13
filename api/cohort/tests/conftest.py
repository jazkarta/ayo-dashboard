import pytest
from unittest.mock import MagicMock
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from users.models.user import UserRole
from cohort.models import Cohort

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
    return User.objects.create_user(
        email="researcher@example.com",
        password="password123",
        role=UserRole.RESEARCHER,
        first_name="Research",
        last_name="er"
    )


@pytest.fixture
def other_researcher(db):
    return User.objects.create_user(
        email="other@example.com",
        password="password123",
        role=UserRole.RESEARCHER,
    )


@pytest.fixture
def participant_user(db):
    return User.objects.create_user(
        email="participant@example.com",
        username="participant",
        password="password123",
        role=UserRole.PARTICIPANT,
        is_active=True,
    )


@pytest.fixture
def cohort(db, researcher_user):
    return Cohort.objects.create(
        name="Alpha Cohort",
        description="Test cohort",
        created_by=researcher_user
    )


@pytest.fixture
def api_client():
    return APIClient()
