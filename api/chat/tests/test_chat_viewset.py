import csv
import io
from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from chat.models import Chat, ChatMedia, ConversationModel

User = get_user_model()

CHAT_CREATE_URL = 'chat_create'


def conversation_details_url(pk):
    return reverse('conversation-details', kwargs={'pk': pk})


def conversation_export_url(pk):
    return reverse('conversation-export', kwargs={'pk': pk})


def parse_csv_response(response):
    content = b''.join(
        chunk if isinstance(chunk, bytes) else chunk.encode('utf-8')
        for chunk in response.streaming_content
    ).decode('utf-8')
    return [row for row in csv.reader(io.StringIO(content)) if row]


@pytest.mark.django_db
class TestChatCreate:

    def _post(self, client, payload):
        return client.post(reverse(CHAT_CREATE_URL), payload, format='json')

    def _base_payload(self, conversation, user):
        return {
            'conversation_id': conversation.conversation_id,
            'user_email': user.email,
            'model_name': 'gpt-4o',
            'prompt': 'Analyze this',
            'response': 'Here is the analysis',
        }

    def test_create_chat_without_attachments(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = self._post(api_client, self._base_payload(conversation, chat_user))

        assert response.status_code == status.HTTP_201_CREATED
        assert Chat.objects.filter(conversation=conversation).count() == 1
        assert ChatMedia.objects.count() == 0

    @pytest.mark.parametrize('attachments, expected_count', [
        (
            [{'filename': 'report.pdf', 'type': 'application/pdf', 'url': 'https://storage.googleapis.com/bucket/report.pdf'}],
            1,
        ),
        (
            [
                {'filename': 'a.png', 'type': 'image/png', 'url': 'https://storage.googleapis.com/bucket/a.png'},
                {'filename': 'b.pdf', 'type': 'application/pdf', 'url': 'https://storage.googleapis.com/bucket/b.pdf'},
                {'filename': 'c.csv', 'type': 'text/csv', 'url': 'https://storage.googleapis.com/bucket/c.csv'},
            ],
            3,
        ),
    ])
    def test_create_chat_with_attachments(self, api_client, chat_user, conversation, attachments, expected_count):
        api_client.force_authenticate(user=chat_user)
        payload = {**self._base_payload(conversation, chat_user), 'attachments': attachments}
        response = self._post(api_client, payload)

        assert response.status_code == status.HTTP_201_CREATED
        chat = Chat.objects.get(conversation=conversation)
        assert ChatMedia.objects.filter(chat=chat).count() == expected_count
        for item in attachments:
            assert ChatMedia.objects.filter(
                chat=chat,
                filename=item['filename'],
                type=item['type'],
                url=item['url'],
            ).exists()

    @pytest.mark.parametrize('invalid_attachment', [
        {'filename': 'report.pdf', 'type': 'application/pdf'},
        {'filename': 'report.pdf', 'url': 'https://storage.googleapis.com/bucket/report.pdf'},
        {'type': 'application/pdf', 'url': 'https://storage.googleapis.com/bucket/report.pdf'},
        {'filename': 'report.pdf', 'type': 'application/pdf', 'url': 'not-a-url'},
    ])
    def test_create_chat_invalid_attachment_returns_400(self, api_client, chat_user, conversation, invalid_attachment):
        api_client.force_authenticate(user=chat_user)
        payload = {**self._base_payload(conversation, chat_user), 'attachments': [invalid_attachment]}
        response = self._post(api_client, payload)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert ChatMedia.objects.count() == 0

    def test_create_chat_empty_attachments_list(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        payload = {**self._base_payload(conversation, chat_user), 'attachments': []}
        response = self._post(api_client, payload)

        assert response.status_code == status.HTTP_201_CREATED
        assert ChatMedia.objects.count() == 0


@pytest.mark.django_db
class TestConversationDetailsAttachments:

    def test_chat_without_attachments_returns_empty_list(self, api_client, chat_user, chat):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_details_url(chat.conversation.pk))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['attachments'] == []

    def test_chat_with_attachment_returns_attachment_data(self, api_client, chat_user, chat, chat_media):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_details_url(chat.conversation.pk))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        attachments = results[0]['attachments']
        assert len(attachments) == 1
        assert attachments[0]['filename'] == chat_media.filename
        assert attachments[0]['type'] == chat_media.type
        assert attachments[0]['url'] == chat_media.url
        assert 'id' in attachments[0]

    def test_chat_with_multiple_attachments_returns_all(self, api_client, chat_user, chat):
        api_client.force_authenticate(user=chat_user)
        media_items = [
            ChatMedia.objects.create(chat=chat, filename=f'file{i}.pdf', type='application/pdf', url=f'https://storage.googleapis.com/bucket/file{i}.pdf')
            for i in range(3)
        ]

        response = api_client.get(conversation_details_url(chat.conversation.pk))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results[0]['attachments']) == len(media_items)

    def test_details_includes_conversation_title(self, api_client, chat_user, chat):
        chat.conversation.title = 'Test Conversation Title'
        chat.conversation.save()
        api_client.force_authenticate(user=chat_user)

        response = api_client.get(conversation_details_url(chat.conversation.pk))

        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Test Conversation Title'


@pytest.mark.django_db
class TestConversationExport:

    def test_export_unauthenticated_returns_403(self, api_client, conversation):
        response = api_client.get(conversation_export_url(conversation.pk))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_export_returns_streaming_csv(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_export_url(conversation.pk))

        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'text/csv'
        assert 'attachment' in response['Content-Disposition']
        assert 'conversation-test-conversation.csv' in response['Content-Disposition']
        assert response.streaming is True

    def test_export_csv_has_correct_headers(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_export_url(conversation.pk))

        rows = parse_csv_response(response)
        assert rows[0] == [
            'conversation_title', 'conversation_id', 'model_name',
            'participant_name', 'family_id', 'cohort_id', 'message_date',
            'prompt', 'response', 'attachment_urls',
        ]

    def test_export_csv_row_contains_correct_data(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_export_url(conversation.pk))

        rows = parse_csv_response(response)
        assert len(rows) == 2  # header + 1 chat
        data_row = rows[1]
        assert data_row[1] == conversation.conversation_id
        assert data_row[2] == conversation.model_name
        assert data_row[4] == ''  # no participant profile → empty family_id
        assert data_row[5] == ''  # no cohort
        assert data_row[7] == chat.prompt
        assert data_row[8] == chat.response
        assert data_row[9] == ''

    def test_export_empty_conversation_returns_only_headers(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_export_url(conversation.pk))

        rows = parse_csv_response(response)
        assert len(rows) == 1

    def test_export_multiple_chats_ordered_chronologically(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        prompts = ['First prompt', 'Second prompt', 'Third prompt']
        for prompt in prompts:
            Chat.objects.create(conversation=conversation, prompt=prompt, response='ok')

        response = api_client.get(conversation_export_url(conversation.pk))

        rows = parse_csv_response(response)
        assert len(rows) == 4  # header + 3 chats
        assert [row[7] for row in rows[1:]] == prompts

    def test_export_single_attachment_url_in_column(self, api_client, chat_user, conversation, chat, chat_media):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_export_url(conversation.pk))

        rows = parse_csv_response(response)
        assert rows[1][9] == chat_media.url

    def test_export_multiple_attachments_are_pipe_separated(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        urls = [
            'https://storage.googleapis.com/bucket/file1.pdf',
            'https://storage.googleapis.com/bucket/file2.pdf',
        ]
        for i, url in enumerate(urls):
            ChatMedia.objects.create(chat=chat, filename=f'file{i}.pdf', type='application/pdf', url=url)

        response = api_client.get(conversation_export_url(conversation.pk))

        rows = parse_csv_response(response)
        attachment_urls = rows[1][9].split('|')
        assert sorted(attachment_urls) == sorted(urls)


@pytest.mark.django_db
class TestConversationListSearch:

    def test_search_by_title(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        ConversationModel.objects.create(conversation_id='c1', user=chat_user, title='Climate Discussion', model_name='gpt-4o')
        ConversationModel.objects.create(conversation_id='c2', user=chat_user, title='Sports Talk', model_name='gpt-4o')

        response = api_client.get(reverse('conversation-list'), {'search': 'Climate'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Climate Discussion'

    def test_search_by_participant_email(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        other_user = User.objects.create_user(email='other@example.com', password='pass')
        ConversationModel.objects.create(conversation_id='c1', user=chat_user, title='My Chat', model_name='gpt-4o')
        ConversationModel.objects.create(conversation_id='c2', user=other_user, title='Their Chat', model_name='gpt-4o')

        response = api_client.get(reverse('conversation-list'), {'search': 'other@example.com'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Their Chat'

    def test_search_by_participant_first_name(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        chat_user.first_name = 'Alice'
        chat_user.save()
        ConversationModel.objects.create(conversation_id='c1', user=chat_user, title='Alice Chat', model_name='gpt-4o')

        response = api_client.get(reverse('conversation-list'), {'search': 'Alice'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Alice Chat'

    def test_search_no_match_returns_empty(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)

        response = api_client.get(reverse('conversation-list'), {'search': 'zzznomatch'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 0

    def test_no_search_param_returns_all(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        ConversationModel.objects.create(conversation_id='c1', user=chat_user, title='First', model_name='gpt-4o')
        ConversationModel.objects.create(conversation_id='c2', user=chat_user, title='Second', model_name='gpt-4o')

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 2


@pytest.mark.django_db
class TestConversationListNumberOfTurns:

    def test_conversation_with_no_chats_returns_zero(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['number_of_turns'] == 0

    def test_conversation_with_chats_returns_correct_count(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        Chat.objects.create(conversation=conversation, prompt='Q1', response='A1')
        Chat.objects.create(conversation=conversation, prompt='Q2', response='A2')
        Chat.objects.create(conversation=conversation, prompt='Q3', response='A3')

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['number_of_turns'] == 3

    def test_error_responses_are_excluded_from_turns(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        Chat.objects.create(conversation=conversation, prompt='Q1', response='Valid response')
        Chat.objects.create(
            conversation=conversation,
            prompt='Q2',
            response=f'{Chat.ERROR_RESPONSE_PREFIX}: vertex_ai RateLimitError',
        )

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['number_of_turns'] == 1

    def test_each_conversation_has_independent_turn_count(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        c1 = ConversationModel.objects.create(conversation_id='t1', user=chat_user, model_name='gpt-4o', title='One Turn')
        c2 = ConversationModel.objects.create(conversation_id='t2', user=chat_user, model_name='gpt-4o', title='Two Turns')
        Chat.objects.create(conversation=c1, prompt='Q1', response='A1')
        Chat.objects.create(conversation=c2, prompt='Q1', response='A1')
        Chat.objects.create(conversation=c2, prompt='Q2', response='A2')

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        counts = {r['title']: r['number_of_turns'] for r in results}
        assert counts['One Turn'] == 1
        assert counts['Two Turns'] == 2


def bulk_export_url():
    return reverse('conversation-bulk-export')


@pytest.mark.django_db
class TestConversationFilter:

    def test_filter_by_participant_username(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        other_user = User.objects.create_user(email='other@example.com', password='pass', username='OtherUser')
        ConversationModel.objects.create(conversation_id='c1', user=chat_user, title='Mine')
        ConversationModel.objects.create(conversation_id='c2', user=other_user, title='Theirs')

        response = api_client.get(reverse('conversation-list'), {'participant_username': 'OtherUser'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Theirs'

    def test_filter_by_participant_username_partial_match_returns_no_results(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        chat_user.username = 'ChatUser'
        chat_user.save()
        other_user = User.objects.create_user(email='other@example.com', password='pass', username='OtherUser')
        ConversationModel.objects.create(conversation_id='c1', user=chat_user, title='Mine')
        ConversationModel.objects.create(conversation_id='c2', user=other_user, title='Theirs')

        response = api_client.get(
            reverse('conversation-list'),
            {'participant_username': 'Chat'},
        )

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 0

    def test_filter_by_date_from_excludes_older_conversations(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        old = ConversationModel.objects.create(conversation_id='c1', user=chat_user, title='Old')
        ConversationModel.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=10))
        recent = ConversationModel.objects.create(conversation_id='c2', user=chat_user, title='Recent')

        yesterday = (timezone.now().date() - timedelta(days=1)).isoformat()
        response = api_client.get(reverse('conversation-list'), {'date_from': yesterday})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == str(recent.id)

    def test_filter_by_date_to_excludes_newer_conversations(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        old = ConversationModel.objects.create(conversation_id='c1', user=chat_user, title='Old')
        ConversationModel.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=10))
        ConversationModel.objects.create(conversation_id='c2', user=chat_user, title='Recent')

        a_week_ago = (timezone.now().date() - timedelta(days=7)).isoformat()
        response = api_client.get(reverse('conversation-list'), {'date_to': a_week_ago})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Old'

    def test_filter_combined_username_and_date(self, api_client, chat_user):
        from datetime import timedelta
        api_client.force_authenticate(user=chat_user)
        chat_user.username = 'ChatUser'
        chat_user.save()
        other_user = User.objects.create_user(email='other@example.com', password='pass', username='OtherUser')
        recent = ConversationModel.objects.create(conversation_id='c1', user=chat_user, title='Mine Recent')
        old = ConversationModel.objects.create(conversation_id='c2', user=chat_user, title='Mine Old')
        ConversationModel.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=10))
        ConversationModel.objects.create(conversation_id='c3', user=other_user, title='Theirs Recent')

        yesterday = (timezone.now().date() - timedelta(days=1)).isoformat()
        response = api_client.get(
            reverse('conversation-list'),
            {'participant_username': 'ChatUser', 'date_from': yesterday},
        )

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Mine Recent'

    def test_no_filters_returns_all(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        ConversationModel.objects.create(conversation_id='c1', user=chat_user, model_name='gpt-4o')
        ConversationModel.objects.create(conversation_id='c2', user=chat_user, model_name='claude')

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 2

    def test_filter_unauthenticated_returns_403(self, api_client):
        response = api_client.get(reverse('conversation-list'), {'model_name': 'gpt-4o'})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_filter_by_turns_min(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        short = ConversationModel.objects.create(conversation_id='f1', user=chat_user, title='Short')
        long = ConversationModel.objects.create(conversation_id='f2', user=chat_user, title='Long')
        Chat.objects.create(conversation=short, prompt='Q1', response='A1')
        for i in range(5):
            Chat.objects.create(conversation=long, prompt=f'Q{i}', response=f'A{i}')

        response = api_client.get(reverse('conversation-list'), {'turns_min': 3})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Long'

    def test_filter_by_turns_max(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        short = ConversationModel.objects.create(conversation_id='f1', user=chat_user, title='Short')
        long = ConversationModel.objects.create(conversation_id='f2', user=chat_user, title='Long')
        Chat.objects.create(conversation=short, prompt='Q1', response='A1')
        for i in range(5):
            Chat.objects.create(conversation=long, prompt=f'Q{i}', response=f'A{i}')

        response = api_client.get(reverse('conversation-list'), {'turns_max': 2})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Short'

    def test_filter_by_turns_min_and_max(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        for conv_id, title, turns in [('f1', 'Zero', 0), ('f2', 'Three', 3), ('f3', 'Seven', 7)]:
            conv = ConversationModel.objects.create(conversation_id=conv_id, user=chat_user, title=title)
            for i in range(turns):
                Chat.objects.create(conversation=conv, prompt=f'Q{i}', response=f'A{i}')

        response = api_client.get(reverse('conversation-list'), {'turns_min': 2, 'turns_max': 5})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Three'


@pytest.mark.django_db
class TestConversationCohort:

    def test_create_conversation_auto_assigns_cohort(self, api_client, chat_user_with_cohort, cohort):
        api_client.force_authenticate(user=chat_user_with_cohort)
        payload = {'conversation_id': 'cohort-conv-001', 'title': 'Cohort Chat', 'model_name': 'gpt-4o'}
        response = api_client.post(reverse('conversation-list'), payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        conv = ConversationModel.objects.get(conversation_id='cohort-conv-001')
        assert conv.cohort == cohort

    def test_create_conversation_no_cohort_when_profile_missing(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        payload = {'conversation_id': 'no-cohort-conv-001', 'title': 'No Cohort', 'model_name': 'gpt-4o'}
        response = api_client.post(reverse('conversation-list'), payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        conv = ConversationModel.objects.get(conversation_id='no-cohort-conv-001')
        assert conv.cohort is None

    def test_conversation_list_includes_cohort(self, api_client, chat_user_with_cohort, cohort):
        api_client.force_authenticate(user=chat_user_with_cohort)
        ConversationModel.objects.create(
            conversation_id='list-cohort-001', user=chat_user_with_cohort,
            title='Listed', model_name='gpt-4o', cohort=cohort,
        )
        response = api_client.get(reverse('conversation-list'))
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['cohort']['id'] == str(cohort.id)


@pytest.mark.django_db
class TestConversationMarkDeleted:

    def _url(self):
        return reverse('conversation-mark-deleted')

    def test_unauthenticated_returns_403(self, api_client, conversation):
        response = api_client.patch(self._url(), {'conversation_id': conversation.conversation_id}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_missing_conversation_id_returns_400(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        response = api_client.patch(self._url(), {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unknown_conversation_returns_404(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        response = api_client.patch(self._url(), {'conversation_id': 'nonexistent-id'}, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_sets_is_deleted_flag(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = api_client.patch(self._url(), {'conversation_id': conversation.conversation_id}, format='json')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        conversation.refresh_from_db()
        assert conversation.is_deleted is True

    def test_cannot_flag_another_users_conversation(self, api_client, conversation):
        other_user = User.objects.create_user(email='other@example.com', password='pass')
        api_client.force_authenticate(user=other_user)
        response = api_client.patch(self._url(), {'conversation_id': conversation.conversation_id}, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        conversation.refresh_from_db()
        assert conversation.is_deleted is False


@pytest.mark.django_db
class TestConversationBulkExport:
    # Row layout: title(0), conv_id(1), model(2), participant_name(3),
    #             family_id(4), prompts(5), responses(6), attachment_urls(7)

    def test_bulk_export_unauthenticated_returns_403(self, api_client):
        response = api_client.get(bulk_export_url())
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_bulk_export_returns_streaming_csv(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(bulk_export_url())

        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'text/csv'
        assert 'attachment' in response['Content-Disposition']
        assert response.streaming is True

    def test_bulk_export_csv_has_correct_headers(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(bulk_export_url())

        rows = parse_csv_response(response)
        assert rows[0] == [
            'conversation_title', 'conversation_id', 'model_name',
            'participant_name', 'family_id', 'cohort_id',
            'prompts', 'responses', 'attachment_urls',
        ]

    def test_bulk_export_no_conversations_returns_404(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(bulk_export_url())

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_bulk_export_filename_in_content_disposition(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(bulk_export_url())

        assert 'conversations-all.csv' in response['Content-Disposition']

    def test_bulk_export_one_row_per_conversation(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        c1 = ConversationModel.objects.create(conversation_id='b1', user=chat_user, title='First', model_name='gpt-4o')
        c2 = ConversationModel.objects.create(conversation_id='b2', user=chat_user, title='Second', model_name='claude')
        Chat.objects.create(conversation=c1, prompt='p1', response='r1')
        Chat.objects.create(conversation=c2, prompt='p2', response='r2')

        response = api_client.get(bulk_export_url())

        rows = parse_csv_response(response)
        assert len(rows) == 3  # header + 1 row per conversation
        exported_conv_ids = {row[1] for row in rows[1:]}
        assert exported_conv_ids == {'b1', 'b2'}

    def test_bulk_export_csv_row_contains_correct_data(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(bulk_export_url())

        rows = parse_csv_response(response)
        assert len(rows) == 2  # header + 1 conversation row
        data_row = rows[1]
        assert data_row[1] == conversation.conversation_id
        assert data_row[2] == conversation.model_name
        assert data_row[4] == ''  # no participant profile → empty family_id
        assert data_row[5] == ''  # no cohort
        assert data_row[6] == chat.prompt
        assert data_row[7] == chat.response
        assert data_row[8] == ''

    def test_bulk_export_prompts_and_responses_pipe_joined(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        conv = ConversationModel.objects.create(conversation_id='b1', user=chat_user, title='Test')
        messages = [('First prompt', 'First response'), ('Second prompt', 'Second response')]
        for prompt, response in messages:
            Chat.objects.create(conversation=conv, prompt=prompt, response=response)

        response = api_client.get(bulk_export_url())

        rows = parse_csv_response(response)
        assert len(rows) == 2  # header + 1 conversation row
        assert rows[1][6] == 'First prompt|Second prompt'
        assert rows[1][7] == 'First response|Second response'

    def test_bulk_export_filtered_by_participant_username(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        chat_user.username = 'ChatUser'
        chat_user.save()
        other_user = User.objects.create_user(email='other@example.com', password='pass', username='OtherUser')
        ConversationModel.objects.create(conversation_id='b1', user=chat_user, title='Mine')
        ConversationModel.objects.create(conversation_id='b2', user=other_user, title='Theirs')

        response = api_client.get(bulk_export_url(), {'participant_username': 'ChatUser'})

        rows = parse_csv_response(response)
        assert len(rows) == 2  # header + 1 matching row
        assert rows[1][1] == 'b1'

    def test_bulk_export_filtered_by_search(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        ConversationModel.objects.create(conversation_id='b1', user=chat_user, title='Climate Research')
        ConversationModel.objects.create(conversation_id='b2', user=chat_user, title='Sports Talk')

        response = api_client.get(bulk_export_url(), {'search': 'Climate'})

        rows = parse_csv_response(response)
        assert len(rows) == 2  # header + 1 matching row
        assert rows[1][0] == 'Climate Research'

    def test_bulk_export_attachment_urls_pipe_joined(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        urls = [
            'https://storage.googleapis.com/bucket/file1.pdf',
            'https://storage.googleapis.com/bucket/file2.pdf',
        ]
        for i, url in enumerate(urls):
            ChatMedia.objects.create(chat=chat, filename=f'file{i}.pdf', type='application/pdf', url=url)

        response = api_client.get(bulk_export_url())

        rows = parse_csv_response(response)
        assert sorted(rows[1][8].split('|')) == sorted(urls)


@pytest.mark.django_db
class TestConversationListParticipantAge:

    def test_age_returned_correctly_for_participant_with_profile(self, api_client, chat_user_with_profile):
        api_client.force_authenticate(user=chat_user_with_profile)
        ConversationModel.objects.create(conversation_id='age-c1', user=chat_user_with_profile, title='Age Test')

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        dob = date(2000, 1, 1)
        today = date.today()
        expected_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        assert results[0]['participant']['age'] == expected_age

    def test_age_is_none_when_participant_has_no_profile(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['participant']['age'] is None

    def test_age_returns_less_than_one_year_for_infant(self, api_client, chat_user, db):
        from participant.models import ParticipantProfile
        ParticipantProfile.objects.create(
            user=chat_user,
            date_of_birth=date.today() - timedelta(days=30),
            family_id='FAM-TEST',
        )
        ConversationModel.objects.create(conversation_id='age-c2', user=chat_user, title='Infant Test')
        api_client.force_authenticate(user=chat_user)

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['participant']['age'] == 'Less than one year'

    def test_age_is_correct_on_birthday(self, api_client, chat_user, db):
        from participant.models import ParticipantProfile
        today = date.today()
        dob = date(today.year - 10, today.month, today.day)
        ParticipantProfile.objects.create(
            user=chat_user,
            date_of_birth=dob,
            family_id='FAM-BDAY',
        )
        ConversationModel.objects.create(conversation_id='age-c3', user=chat_user, title='Birthday Test')
        api_client.force_authenticate(user=chat_user)

        response = api_client.get(reverse('conversation-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert results[0]['participant']['age'] == 10


@pytest.mark.django_db
class TestConversationFilterByAge:

    def test_filter_by_age_returns_matching_conversations(self, api_client, chat_user_with_profile):
        api_client.force_authenticate(user=chat_user_with_profile)
        ConversationModel.objects.create(conversation_id='age-f1', user=chat_user_with_profile, title='Matching')

        dob = date(2000, 1, 1)
        today = date.today()
        expected_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        response = api_client.get(reverse('conversation-list'), {'participant_age': expected_age})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Matching'

    def test_filter_by_age_excludes_different_age(self, api_client, chat_user_with_profile):
        api_client.force_authenticate(user=chat_user_with_profile)
        ConversationModel.objects.create(conversation_id='age-f2', user=chat_user_with_profile, title='Should not appear')

        response = api_client.get(reverse('conversation-list'), {'participant_age': 5})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 0

    def test_filter_by_age_zero_returns_infant_conversations(self, api_client, chat_user, db):
        from participant.models import ParticipantProfile
        ParticipantProfile.objects.create(
            user=chat_user,
            date_of_birth=date.today() - timedelta(days=30),
            family_id='FAM-INFANT',
        )
        ConversationModel.objects.create(conversation_id='age-f3', user=chat_user, title='Infant')
        api_client.force_authenticate(user=chat_user)

        response = api_client.get(reverse('conversation-list'), {'participant_age': 0})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Infant'

    def test_filter_by_age_excludes_participant_with_no_profile(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)

        response = api_client.get(reverse('conversation-list'), {'participant_age': 14})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 0

    def test_filter_by_age_combined_with_username(self, api_client, chat_user_with_profile, db):
        from participant.models import ParticipantProfile
        chat_user_with_profile.username = 'ProfileUser'
        chat_user_with_profile.save()

        other_user = User.objects.create_user(email='other2@example.com', password='pass', username='OtherUser')
        ParticipantProfile.objects.create(
            user=other_user,
            date_of_birth=date(2000, 1, 1),
            family_id='FAM-OTHER',
        )

        ConversationModel.objects.create(conversation_id='age-f4', user=chat_user_with_profile, title='Profile Chat')
        ConversationModel.objects.create(conversation_id='age-f5', user=other_user, title='Other Chat')
        api_client.force_authenticate(user=chat_user_with_profile)

        dob = date(2000, 1, 1)
        today = date.today()
        expected_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        response = api_client.get(reverse('conversation-list'), {'participant_age': expected_age, 'participant_username': 'ProfileUser'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Profile Chat'
