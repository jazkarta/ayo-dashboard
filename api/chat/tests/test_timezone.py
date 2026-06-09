from datetime import datetime, timezone as dt_timezone

import pytest
from django.urls import reverse
from rest_framework import status

from chat.models import Chat, ConversationModel
from chat.tests.test_chat_viewset import (
    bulk_export_url,
    conversation_export_url,
    parse_table_sections,
)

_FIXED_UTC = datetime(2026, 6, 3, 17, 0, 0, tzinfo=dt_timezone.utc)

_TIMEZONE_SCENARIOS = [
    ('America/New_York',    'June 03, 2026, 01:00 PM'),  # EDT  UTC-4
    ('America/Los_Angeles', 'June 03, 2026, 10:00 AM'),  # PDT  UTC-7
    ('Asia/Kolkata',        'June 03, 2026, 10:30 PM'),  # IST  UTC+5:30
    ('UTC',                 'June 03, 2026, 05:00 PM'),
    ('',                    'June 03, 2026, 05:00 PM'),  # empty falls back to UTC
]


def _make_conversation(user, tz, conv_id='tz-test'):
    conv = ConversationModel.objects.create(
        conversation_id=conv_id, user=user, title='TZ Test', timezone=tz
    )
    ConversationModel.objects.filter(pk=conv.pk).update(created_at=_FIXED_UTC)
    return conv


@pytest.mark.django_db
class TestTimezoneConversion:

    @pytest.mark.parametrize('tz, expected', _TIMEZONE_SCENARIOS)
    def test_conversation_list_created_at(self, api_client, chat_user, tz, expected):
        api_client.force_authenticate(user=chat_user)
        _make_conversation(chat_user, tz)

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['created_at'] == expected

    @pytest.mark.parametrize('tz, expected', _TIMEZONE_SCENARIOS)
    def test_single_export_message_date(self, api_client, chat_user, tz, expected):
        api_client.force_authenticate(user=chat_user)
        conv = _make_conversation(chat_user, tz)
        chat = Chat.objects.create(conversation=conv, prompt='p', response='r')
        Chat.objects.filter(pk=chat.pk).update(created_at=_FIXED_UTC)

        response = api_client.get(conversation_export_url(conv.pk))

        turns = parse_table_sections(response)[1]['rows']
        assert turns[0]['message_date'] == expected

    @pytest.mark.parametrize('tz, expected', _TIMEZONE_SCENARIOS)
    def test_bulk_export_datetime(self, api_client, chat_user, tz, expected):
        api_client.force_authenticate(user=chat_user)
        conv = _make_conversation(chat_user, tz)
        chat = Chat.objects.create(conversation=conv, prompt='p', response='r')
        Chat.objects.filter(pk=chat.pk).update(created_at=_FIXED_UTC)

        response = api_client.get(bulk_export_url())

        convs = parse_table_sections(response)[0]['rows']
        assert convs[0]['datetime'] == f"{expected} ({tz or 'UTC'})"
