from datetime import datetime, timezone as dt_timezone

import pytest
from django.urls import reverse
from rest_framework import status

from chat.models import Chat, ConversationModel
from chat.tests.test_chat_viewset import (
    bulk_export_url,
    conversation_export_url,
    parse_csv_as_dicts,
)

_FIXED_UTC = datetime(2026, 6, 3, 17, 0, 0, tzinfo=dt_timezone.utc)

_TIMEZONE_SCENARIOS = [
    ('America/New_York',    'June 03, 2026, 01:00 PM'),  # EDT  UTC-4
    ('America/Los_Angeles', 'June 03, 2026, 10:00 AM'),  # PDT  UTC-7
    ('Asia/Kolkata',        'June 03, 2026, 10:30 PM'),  # IST  UTC+5:30
    ('UTC',                 'June 03, 2026, 05:00 PM'),
    ('Invalid/Zone',        'June 03, 2026, 05:00 PM'),  # falls back to UTC
]


@pytest.mark.django_db
class TestTimezoneConversion:

    @pytest.mark.parametrize('tz_header, expected', _TIMEZONE_SCENARIOS)
    def test_conversation_list_created_at(self, api_client, chat_user, tz_header, expected):
        api_client.force_authenticate(user=chat_user)
        conv = ConversationModel.objects.create(conversation_id='tz-list', user=chat_user, title='TZ Test')
        ConversationModel.objects.filter(pk=conv.pk).update(created_at=_FIXED_UTC)

        response = api_client.get(reverse('conversation-list'), HTTP_X_TIMEZONE=tz_header)

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['created_at'] == expected

    @pytest.mark.parametrize('tz_header, expected', _TIMEZONE_SCENARIOS)
    def test_single_export_message_date(self, api_client, chat_user, conversation, tz_header, expected):
        api_client.force_authenticate(user=chat_user)
        chat = Chat.objects.create(conversation=conversation, prompt='p', response='r')
        Chat.objects.filter(pk=chat.pk).update(created_at=_FIXED_UTC)

        response = api_client.get(conversation_export_url(conversation.pk), HTTP_X_TIMEZONE=tz_header)

        rows = parse_csv_as_dicts(response)
        assert rows[0]['message_date'] == expected

    @pytest.mark.parametrize('tz_header, expected', _TIMEZONE_SCENARIOS)
    def test_bulk_export_datetime(self, api_client, chat_user, conversation, tz_header, expected):
        api_client.force_authenticate(user=chat_user)
        chat = Chat.objects.create(conversation=conversation, prompt='p', response='r')
        Chat.objects.filter(pk=chat.pk).update(created_at=_FIXED_UTC)

        response = api_client.get(bulk_export_url(), HTTP_X_TIMEZONE=tz_header)

        rows = parse_csv_as_dicts(response)
        assert rows[0]['datetime'] == expected
