import csv
from collections import defaultdict

from django.db.models import Prefetch
from django.http import StreamingHttpResponse

from chat.models.chat_models import Chat, ChatMedia


class _Echo:
    def write(self, value):
        return value


def _streaming_response(rows_iter, filename):
    writer = csv.writer(_Echo())
    response = StreamingHttpResponse(
        (writer.writerow(row) for row in rows_iter),
        content_type='text/csv',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


class ConversationExportManager:

    CSV_HEADERS = [
        'conversation_title', 'conversation_id', 'model_name',
        'participant_name', 'message_date',
        'prompt', 'response', 'attachment_urls',
    ]

    @classmethod
    def rows(cls, queryset):
        yield cls.CSV_HEADERS
        for conversation in queryset.iterator():
            yield from cls._conversation_rows(conversation)

    @staticmethod
    def _conversation_rows(conversation):
        participant = conversation.user
        participant_name = (
            f"{participant.first_name} {participant.last_name}".strip()
            or participant.username
        )

        media_map = defaultdict(list)
        for item in ChatMedia.objects.filter(
            chat__conversation=conversation
        ).values('chat_id', 'url'):
            media_map[item['chat_id']].append(item['url'])

        for chat in Chat.objects.filter(
            conversation=conversation
        ).only('prompt', 'response', 'created_at').order_by('created_at').iterator():
            yield [
                conversation.title or '',
                conversation.conversation_id,
                conversation.model_name or '',
                participant_name,
                chat.created_at.isoformat(),
                chat.prompt,
                chat.response,
                '|'.join(media_map.get(chat.id, [])),
            ]

    @classmethod
    def streaming_response(cls, queryset, filename):
        return _streaming_response(cls.rows(queryset), filename)


class ConversationBulkExportManager:

    CSV_HEADERS = [
        'conversation_title', 'conversation_id', 'model_name',
        'participant_name', 'participant_email', 'created_at',
        'prompts', 'responses', 'attachment_urls',
    ]

    @classmethod
    def rows(cls, queryset):
        yield cls.CSV_HEADERS
        queryset = queryset.prefetch_related(
            Prefetch('chats', queryset=Chat.objects.only('id', 'prompt', 'response').order_by('created_at')),
            'chats__media',
        )
        for conversation in queryset:
            participant = conversation.user
            participant_name = (
                f"{participant.first_name} {participant.last_name}".strip()
                or participant.username
            )
            chats = list(conversation.chats.all())
            attachment_urls = [media.url for chat in chats for media in chat.media.all()]
            yield [
                conversation.title or '',
                conversation.conversation_id,
                conversation.model_name or '',
                participant_name,
                participant.email,
                conversation.created_at.isoformat(),
                '|'.join(chat.prompt or '' for chat in chats),
                '|'.join(chat.response or '' for chat in chats),
                '|'.join(attachment_urls),
            ]

    @classmethod
    def streaming_response(cls, queryset, filename):
        return _streaming_response(cls.rows(queryset), filename)
