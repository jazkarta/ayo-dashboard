import csv
import io
import zipfile

import pytest
from django.urls import reverse
from rest_framework import status

from chat.managers import ChatExportManager, ConversationExportManager
from chat.models import Chat, ChatMedia, ConversationModel
from chat.tests.helpers import BULK_EXPORT_FIELD_VALUES


def conversation_export_url(pk):
    return reverse('conversation-export', kwargs={'pk': pk})


def bulk_export_url():
    return reverse('conversation-bulk-export')


def parse_zip_tables(response):
    archive = zipfile.ZipFile(io.BytesIO(b''.join(response.streaming_content)))
    tables = {}
    for name in archive.namelist():
        with archive.open(name) as member:
            rows = list(csv.reader(io.TextIOWrapper(member, encoding='utf-8')))
        headers = rows[0] if rows else []
        tables[name] = {'headers': headers, 'rows': [dict(zip(headers, row)) for row in rows[1:]]}
    return tables


def table_rows(tables, suffix):
    return [
        row
        for name, table in sorted(tables.items())
        if name.endswith(suffix)
        for row in table['rows']
    ]


@pytest.mark.django_db
class TestConversationExport:

    def test_export_unauthenticated_returns_403(self, api_client, conversation):
        response = api_client.get(conversation_export_url(conversation.pk))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_export_returns_streaming_zip(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_export_url(conversation.pk))

        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/zip'
        assert 'attachment' in response['Content-Disposition']
        assert 'conversation-conv-test-001.zip' in response['Content-Disposition']
        assert response.streaming is True

    def test_export_zip_contains_both_tables_with_correct_headers(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(conversation_export_url(conversation.pk))

        tables = parse_zip_tables(response)
        assert set(tables) == {'conversations.csv', 'turns.csv'}
        assert tables['conversations.csv']['headers'] == ConversationExportManager.CSV_HEADERS
        assert tables['turns.csv']['headers'] == ChatExportManager.CSV_HEADERS

    def test_export_turns_table_data_ordered_chronologically(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        prompts = ['First prompt', 'Second prompt', 'Third prompt']
        for prompt in prompts:
            Chat.objects.create(conversation=conversation, prompt=prompt, response='ok')

        response = api_client.get(conversation_export_url(conversation.pk))

        turns = table_rows(parse_zip_tables(response), 'turns.csv')
        assert len(turns) == 3
        assert [row['prompt'] for row in turns] == prompts

    def test_export_attachment_urls_pipe_joined_in_turns_table(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        urls = [
            'https://storage.googleapis.com/bucket/file1.pdf',
            'https://storage.googleapis.com/bucket/file2.pdf',
        ]
        for i, url in enumerate(urls):
            ChatMedia.objects.create(chat=chat, filename=f'file{i}.pdf', type='application/pdf', url=url)

        response = api_client.get(conversation_export_url(conversation.pk))

        turns = table_rows(parse_zip_tables(response), 'turns.csv')
        assert sorted(turns[0]['attachment_urls'].split('|')) == sorted(urls)


@pytest.mark.django_db
class TestConversationBulkExport:

    def test_bulk_export_unauthenticated_returns_403(self, api_client):
        response = api_client.get(bulk_export_url())
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_bulk_export_returns_streaming_zip(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(bulk_export_url())

        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/zip'
        assert 'attachment' in response['Content-Disposition']
        assert response.streaming is True

    def test_bulk_export_zip_has_correct_headers_per_table(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(bulk_export_url())

        tables = parse_zip_tables(response)
        assert tables['conversations.csv']['headers'] == ConversationExportManager.CSV_HEADERS
        assert tables['turns.csv']['headers'] == ChatExportManager.CSV_HEADERS

    def test_bulk_export_no_conversations_returns_404(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(bulk_export_url())

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_bulk_export_filename_in_content_disposition(self, api_client, chat_user, conversation):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(bulk_export_url())

        assert 'conversations-all.zip' in response['Content-Disposition']

    def test_bulk_export_two_csvs_total(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        c1 = ConversationModel.objects.create(conversation_id='b1', user=chat_user, title='First', model_name='gpt-4o')
        c2 = ConversationModel.objects.create(conversation_id='b2', user=chat_user, title='Second', model_name='claude')
        Chat.objects.create(conversation=c1, prompt='p1', response='r1')
        Chat.objects.create(conversation=c2, prompt='p2', response='r2')

        response = api_client.get(bulk_export_url())

        tables = parse_zip_tables(response)
        assert set(tables) == {'conversations.csv', 'turns.csv'}
        convs = table_rows(tables, 'conversations.csv')
        assert {row['conversation_id'] for row in convs} == {'b1', 'b2'}

    def test_bulk_export_csv_row_contains_correct_data(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        response = api_client.get(bulk_export_url())

        convs = table_rows(parse_zip_tables(response), 'conversations.csv')
        assert convs[0] == {
            h: BULK_EXPORT_FIELD_VALUES[h](conversation, chat)
            for h in ConversationExportManager.CSV_HEADERS
        }

    def test_bulk_export_turns_table_contains_all_turns(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        c1 = ConversationModel.objects.create(conversation_id='b1', user=chat_user, title='First')
        c2 = ConversationModel.objects.create(conversation_id='b2', user=chat_user, title='Second')
        Chat.objects.create(conversation=c1, prompt='p1', response='r1')
        Chat.objects.create(conversation=c1, prompt='p2', response='r2')
        Chat.objects.create(conversation=c2, prompt='p3', response='r3')

        response = api_client.get(bulk_export_url())

        tables = parse_zip_tables(response)
        assert len(tables) == 2
        all_turns = table_rows(tables, 'turns.csv')
        assert len(all_turns) == 3
        assert {row['prompt'] for row in all_turns} == {'p1', 'p2', 'p3'}

    def test_bulk_export_filtered_by_participant_username(self, api_client, chat_user):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        api_client.force_authenticate(user=chat_user)
        chat_user.username = 'ChatUser'
        chat_user.save()
        other_user = User.objects.create_user(email='other@example.com', password='pass', username='OtherUser')
        ConversationModel.objects.create(conversation_id='b1', user=chat_user, title='Mine')
        ConversationModel.objects.create(conversation_id='b2', user=other_user, title='Theirs')

        response = api_client.get(bulk_export_url(), {'participant_username': 'ChatUser'})

        convs = table_rows(parse_zip_tables(response), 'conversations.csv')
        assert len(convs) == 1
        assert convs[0]['conversation_id'] == 'b1'

    def test_bulk_export_filtered_by_cohort_id(self, api_client, chat_user_with_cohort, cohort, chat_user):
        api_client.force_authenticate(user=chat_user_with_cohort)
        c1 = ConversationModel.objects.create(conversation_id='be-cohort', user=chat_user_with_cohort, title='In Cohort', cohort=cohort)
        ConversationModel.objects.create(conversation_id='be-no-cohort', user=chat_user, title='No Cohort')
        Chat.objects.create(conversation=c1, prompt='p1', response='r1')

        response = api_client.get(bulk_export_url(), {'cohort_id': str(cohort.id)})

        convs = table_rows(parse_zip_tables(response), 'conversations.csv')
        assert len(convs) == 1
        assert convs[0]['conversation_id'] == 'be-cohort'

    def test_bulk_export_filtered_by_search(self, api_client, chat_user):
        api_client.force_authenticate(user=chat_user)
        ConversationModel.objects.create(conversation_id='b1', user=chat_user, title='Climate Research')
        ConversationModel.objects.create(conversation_id='b2', user=chat_user, title='Sports Talk')

        response = api_client.get(bulk_export_url(), {'search': 'Climate'})

        convs = table_rows(parse_zip_tables(response), 'conversations.csv')
        assert len(convs) == 1
        assert convs[0]['conversation_id'] == 'b1'

    def test_bulk_export_attachment_urls_pipe_joined(self, api_client, chat_user, conversation, chat):
        api_client.force_authenticate(user=chat_user)
        urls = [
            'https://storage.googleapis.com/bucket/file1.pdf',
            'https://storage.googleapis.com/bucket/file2.pdf',
        ]
        for i, url in enumerate(urls):
            ChatMedia.objects.create(chat=chat, filename=f'file{i}.pdf', type='application/pdf', url=url)

        response = api_client.get(bulk_export_url())

        convs = table_rows(parse_zip_tables(response), 'conversations.csv')
        assert sorted(convs[0]['attachment_urls'].split('|')) == sorted(urls)
