from zoneinfo import ZoneInfo

from utils.csv_export_manager import BaseCSVExportManager


class ConversationExportManager(BaseCSVExportManager):

    CSV_HEADERS = [
        'conversation_id', 'model_name', 'username',
        'family_id', 'cohort_id', 'message_date',
        'prompt', 'response', 'attachment_urls',
    ]

    @classmethod
    def rows(cls, queryset):
        yield cls.CSV_HEADERS
        for conversation in queryset:
            yield from cls._conversation_rows(conversation)

    @classmethod
    def per_conversation_rows(cls, conversation):
        yield from cls._conversation_rows(conversation)

    @classmethod
    def _conversation_rows(cls, conversation):
        family_id = cls._family_id(conversation.user)
        tz = ZoneInfo(conversation.timezone or 'UTC')
        for chat in conversation.chats.all():
            yield [
                conversation.conversation_id,
                conversation.model_name or '',
                conversation.user.username or '',
                family_id,
                str(conversation.cohort_id) if conversation.cohort_id else '',
                chat.created_at.astimezone(tz).strftime('%B %d, %Y, %I:%M %p'),
                chat.prompt,
                chat.response,
                '|'.join(media.url for media in chat.media.all()),
            ]


class ConversationBulkExportManager(BaseCSVExportManager):

    CSV_HEADERS = [
        'conversation_id', 'model_name', 'username',
        'family_id', 'cohort_id',
        # 'prompts', 'responses',
        'datetime', 'attachment_urls',
    ]

    @classmethod
    def rows(cls, queryset):
        yield cls.CSV_HEADERS
        for conversation in queryset:
            yield cls._conversation_row(conversation)

    @classmethod
    def per_conversation_rows(cls, conversation):
        yield cls._conversation_row(conversation)

    @classmethod
    def _conversation_row(cls, conversation):
        chats = list(conversation.chats.all())
        attachment_urls = [media.url for chat in chats for media in chat.media.all()]
        tz_name = conversation.timezone or 'UTC'
        tz = ZoneInfo(tz_name)
        return [
            conversation.conversation_id,
            conversation.model_name or '',
            conversation.user.username or '',
            cls._family_id(conversation.user),
            str(conversation.cohort_id) if conversation.cohort_id else '',
            # '|'.join(chat.prompt or '' for chat in chats),
            # '|'.join(chat.response or '' for chat in chats),
            f"{conversation.created_at.astimezone(tz).strftime('%B %d, %Y, %I:%M %p')} ({tz_name})",
            '|'.join(attachment_urls),
        ]
