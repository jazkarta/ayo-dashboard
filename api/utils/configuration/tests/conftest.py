import pytest
from unittest.mock import MagicMock
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from users.models.user import UserRole

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
def admin_user(db):
    return User.objects.create_user(
        email="admin@example.com",
        password="password123",
        role=UserRole.ADMIN,
        is_staff=True,
    )


@pytest.fixture
def researcher_user(db):
    return User.objects.create_user(
        email="researcher@example.com",
        password="password123",
        role=UserRole.RESEARCHER,
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client
