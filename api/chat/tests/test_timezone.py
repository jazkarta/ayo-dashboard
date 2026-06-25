from datetime import datetime, timezone as dt_timezone

import pytest
from django.urls import reverse
from rest_framework import status

from chat.models import Chat, ConversationModel
from chat.tests.test_export import (
    bulk_export_url,
    conversation_export_url,
    parse_zip_tables,
    table_rows,
)

_FIXED_UTC = datetime(2026, 6, 3, 17, 0, 0, tzinfo=dt_timezone.utc)

_TIMEZONE_SCENARIOS = [
    ('America/New_York',    'June 03, 2026, 01:00 PM', '2026-06-03 13:00:00'),  # EDT  UTC-4
    ('America/Los_Angeles', 'June 03, 2026, 10:00 AM', '2026-06-03 10:00:00'),  # PDT  UTC-7
    ('Asia/Kolkata',        'June 03, 2026, 10:30 PM', '2026-06-03 22:30:00'),  # IST  UTC+5:30
    ('UTC',                 'June 03, 2026, 05:00 PM', '2026-06-03 17:00:00'),
    ('',                    'June 03, 2026, 05:00 PM', '2026-06-03 17:00:00'),  # empty falls back to UTC
]


def _make_conversation(user, tz, conv_id='tz-test'):
    conv = ConversationModel.objects.create(
        conversation_id=conv_id, user=user, title='TZ Test', timezone=tz
    )
    ConversationModel.objects.filter(pk=conv.pk).update(created_at=_FIXED_UTC)
    return conv


@pytest.mark.django_db
class TestTimezoneConversion:

    @pytest.mark.parametrize('tz, expected, expected_iso', _TIMEZONE_SCENARIOS)
    def test_conversation_list_created_at(self, api_client, chat_user, tz, expected, expected_iso):
        api_client.force_authenticate(user=chat_user)
        _make_conversation(chat_user, tz)

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['created_at'] == expected

    @pytest.mark.parametrize('tz, expected, expected_iso', _TIMEZONE_SCENARIOS)
    def test_single_export_message_date(self, api_client, chat_user, tz, expected, expected_iso):
        api_client.force_authenticate(user=chat_user)
        conv = _make_conversation(chat_user, tz)
        chat = Chat.objects.create(conversation=conv, prompt='p', response='r')
        Chat.objects.filter(pk=chat.pk).update(created_at=_FIXED_UTC)

        response = api_client.get(conversation_export_url(conv.pk))

        turns = table_rows(parse_zip_tables(response), 'turns.csv')
        assert turns[0]['message_date'] == expected_iso

    @pytest.mark.parametrize('tz, expected, expected_iso', _TIMEZONE_SCENARIOS)
    def test_bulk_export_datetime(self, api_client, chat_user, tz, expected, expected_iso):
        api_client.force_authenticate(user=chat_user)
        conv = _make_conversation(chat_user, tz)
        chat = Chat.objects.create(conversation=conv, prompt='p', response='r')
        Chat.objects.filter(pk=chat.pk).update(created_at=_FIXED_UTC)

        response = api_client.get(bulk_export_url())

        convs = table_rows(parse_zip_tables(response), 'conversations.csv')
        assert convs[0]['created_at'] == expected_iso
