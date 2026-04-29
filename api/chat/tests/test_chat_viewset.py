import csv
import io

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
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
        assert conversation.conversation_id in response['Content-Disposition']
        assert response.streaming is True

    def test_export_csv_has_correct_headers(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_export_url(conversation.pk))

        rows = parse_csv_response(response)
        assert rows[0] == [
            'conversation_title', 'conversation_id', 'model_name',
            'participant_name', 'participant_email', 'message_date',
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
        assert data_row[4] == chat_user.email
        assert data_row[6] == chat.prompt
        assert data_row[7] == chat.response
        assert data_row[8] == ''

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
        assert [row[6] for row in rows[1:]] == prompts

    def test_export_single_attachment_url_in_column(self, api_client, chat_user, conversation, chat, chat_media):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_export_url(conversation.pk))

        rows = parse_csv_response(response)
        assert rows[1][8] == chat_media.url

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
        attachment_urls = rows[1][8].split('|')
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
