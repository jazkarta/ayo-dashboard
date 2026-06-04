from collections import defaultdict
from zoneinfo import ZoneInfo

from django.db.models import Prefetch

from chat.models.chat_models import Chat, ChatMedia
from utils.csv_export_manager import BaseCSVExportManager


class ConversationExportManager(BaseCSVExportManager):

    CSV_HEADERS = [
        'conversation_id', 'model_name', 'username',
        'family_id', 'cohort_id', 'message_date',
        'prompt', 'response', 'attachment_urls',
    ]

    @classmethod
    def rows(cls, queryset, timezone='UTC'):
        yield cls.CSV_HEADERS
        tz = ZoneInfo(timezone)
        for conversation in queryset.iterator():
            yield from cls._conversation_rows(conversation, tz)

    @classmethod
    def _conversation_rows(cls, conversation, tz):
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
                conversation.user.username or '',
                family_id,
                str(conversation.cohort_id) if conversation.cohort_id else '',
                chat.created_at.astimezone(tz).strftime('%B %d, %Y, %I:%M %p'),
                chat.prompt,
                chat.response,
                '|'.join(media_map.get(chat.id, [])),
            ]


class ConversationBulkExportManager(BaseCSVExportManager):

    CSV_HEADERS = [
        'conversation_id', 'model_name', 'username',
        'family_id', 'cohort_id',
        'prompts', 'responses', 'datetime', 'attachment_urls',
    ]

    @classmethod
    def rows(cls, queryset, timezone='UTC'):
        yield cls.CSV_HEADERS
        tz = ZoneInfo(timezone)
        queryset = queryset.prefetch_related(
            Prefetch('chats', queryset=Chat.objects.only('id', 'prompt', 'response', 'created_at').order_by('created_at')),
            'chats__media',
        )
        for conversation in queryset:
            chats = list(conversation.chats.all())
            attachment_urls = [media.url for chat in chats for media in chat.media.all()]
            yield [
                conversation.conversation_id,
                conversation.model_name or '',
                conversation.user.username or '',
                cls._family_id(conversation.user),
                str(conversation.cohort_id) if conversation.cohort_id else '',
                '|'.join(chat.prompt or '' for chat in chats),
                '|'.join(chat.response or '' for chat in chats),
                '|'.join(chat.created_at.astimezone(tz).strftime('%B %d, %Y, %I:%M %p') for chat in chats),
                '|'.join(attachment_urls),
            ]

