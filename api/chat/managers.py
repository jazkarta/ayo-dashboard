from collections import defaultdict

from django.db.models import Prefetch

from chat.models.chat_models import Chat, ChatMedia
from utils.csv_export_manager import BaseCSVExportManager


class ConversationExportManager(BaseCSVExportManager):

    CSV_HEADERS = [
        'conversation_id', 'model_name',
        'family_id', 'cohort_id', 'message_date',
        'prompt', 'response', 'attachment_urls',
    ]

    @classmethod
    def rows(cls, queryset):
        yield cls.CSV_HEADERS
        for conversation in queryset.iterator():
            yield from cls._conversation_rows(conversation)

    @classmethod
    def _conversation_rows(cls, conversation):
        media_map = defaultdict(list)
        for item in ChatMedia.objects.filter(
            chat__conversation=conversation
        ).values('chat_id', 'url'):
            media_map[item['chat_id']].append(item['url'])

        family_id = cls._family_id(conversation.user)

        for chat in Chat.objects.filter(
            conversation=conversation
        ).only('prompt', 'response', 'created_at').order_by('created_at').iterator():
            yield [
                conversation.conversation_id,
                conversation.model_name or '',
                family_id,
                str(conversation.cohort_id) if conversation.cohort_id else '',
                chat.created_at.isoformat(),
                chat.prompt,
                chat.response,
                '|'.join(media_map.get(chat.id, [])),
            ]


class ConversationBulkExportManager(BaseCSVExportManager):

    CSV_HEADERS = [
        'conversation_id', 'model_name',
        'family_id', 'cohort_id',
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
            chats = list(conversation.chats.all())
            attachment_urls = [media.url for chat in chats for media in chat.media.all()]
            yield [
                conversation.conversation_id,
                conversation.model_name or '',
                cls._family_id(conversation.user),
                str(conversation.cohort_id) if conversation.cohort_id else '',
                '|'.join(chat.prompt or '' for chat in chats),
                '|'.join(chat.response or '' for chat in chats),
                '|'.join(attachment_urls),
            ]
