import pytest
from datetime import date
from unittest.mock import MagicMock
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from chat.models import Chat, ChatMedia, ConversationModel
from cohort.models import Cohort
from participant.models import ParticipantProfile
from users.models.user import UserRole

User = get_user_model()


@pytest.fixture(autouse=True)
def mock_signal_keycloak(mocker):
    mock_cls = mocker.patch('users.signals.KeycloakSync')
    mock_cls.return_value = MagicMock()
    return mock_cls


@pytest.fixture(autouse=True)
def mock_signal_librechat(mocker):
    mock_cls = mocker.patch('users.signals.LibreChatSync')
    mock_cls.return_value = MagicMock()
    return mock_cls


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def chat_user(db):
    return User.objects.create_user(
        email='chatuser@example.com',
        password='password123',
    )


@pytest.fixture
def conversation(db, chat_user):
    return ConversationModel.objects.create(
        conversation_id='conv-test-001',
        user=chat_user,
        title='Test Conversation',
        model_name='gpt-4o',
    )


@pytest.fixture
def chat(db, conversation):
    return Chat.objects.create(
        conversation=conversation,
        prompt='Test prompt',
        response='Test response',
    )


@pytest.fixture
def chat_media(db, chat):
    return ChatMedia.objects.create(
        chat=chat,
        filename='report.pdf',
        type='application/pdf',
        url='https://storage.googleapis.com/bucket/report.pdf',
    )


@pytest.fixture
def chat_user_with_profile(db, chat_user):
    ParticipantProfile.objects.create(
        user=chat_user,
        date_of_birth=date(2000, 1, 1),
        family_id='FAM-001',
    )
    return chat_user


@pytest.fixture
def researcher_user(db):
    return User.objects.create_user(
        email='researcher@example.com',
        password='password123',
        role=UserRole.RESEARCHER,
    )


@pytest.fixture
def cohort(db, researcher_user):
    return Cohort.objects.create(name='Test Cohort', created_by=researcher_user)


@pytest.fixture
def chat_user_with_cohort(db, cohort):
    user = User.objects.create_user(
        email='cohortuser@example.com',
        password='password123',
        role=UserRole.PARTICIPANT,
    )
    ParticipantProfile.objects.create(
        user=user,
        date_of_birth=date(2010, 1, 1),
        family_id='FAM-COHORT',
        cohort=cohort,
    )
    return user
