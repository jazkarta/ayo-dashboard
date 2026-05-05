import pytest
from unittest.mock import MagicMock
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from chat.models import Chat, ChatMedia, ConversationModel

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
