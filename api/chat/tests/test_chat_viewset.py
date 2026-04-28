import pytest
from django.urls import reverse
from rest_framework import status

from chat.models import Chat, ChatMedia

CHAT_CREATE_URL = 'chat_create'


def conversation_details_url(pk):
    return reverse('conversation-details', kwargs={'pk': pk})


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
