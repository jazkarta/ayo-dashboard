import json
import zipfile
from zoneinfo import ZoneInfo

from utils.csv_export_manager import BaseCSVExportManager, ZipStreamBuffer


class ConversationExportManager(BaseCSVExportManager):

    CSV_HEADERS = [
        'conversation_id', 'turn_id', 'turn_index', 'model_name', 'username',
        'family_id', 'cohort_id', 'message_date',
        'prompt', 'response', 'metadata', 'attachment_urls',
    ]

    @classmethod
    def per_conversation_rows(cls, conversation):
        family_id = cls._family_id(conversation.user)
        tz = ZoneInfo(conversation.timezone or 'UTC')
        for index, chat in enumerate(conversation.chats.all(), start=1):
            yield [
                conversation.conversation_id,
                str(chat.id),
                index,
                conversation.model_name or '',
                conversation.user.username or '',
                family_id,
                str(conversation.cohort_id) if conversation.cohort_id else '',
                chat.created_at.astimezone(tz).strftime('%B %d, %Y, %I:%M %p'),
                chat.prompt,
                chat.response,
                json.dumps(chat.metadata, indent=4) if chat.metadata else '',
                '|'.join(media.url for media in chat.media.all()),
            ]


class ConversationBulkExportManager(BaseCSVExportManager):

    CSV_HEADERS = [
        'conversation_id', 'model_name', 'username',
        'family_id', 'cohort_id', 'number_of_turns',
        'datetime', 'attachment_urls',
    ]

    @classmethod
    def per_conversation_rows(cls, conversation):
        attachment_urls = [
            media.url
            for chat in conversation.chats.all()
            for media in chat.media.all()
        ]
        tz_name = conversation.timezone or 'UTC'
        tz = ZoneInfo(tz_name)
        yield [
            conversation.conversation_id,
            conversation.model_name or '',
            conversation.user.username or '',
            cls._family_id(conversation.user),
            str(conversation.cohort_id) if conversation.cohort_id else '',
            conversation.turn_count,
            f"{conversation.created_at.astimezone(tz).strftime('%B %d, %Y, %I:%M %p')} ({tz_name})",
            '|'.join(attachment_urls),
        ]


EXPORT_TABLES = (
    ('conversations', ConversationBulkExportManager),
    ('turns', ConversationExportManager),
)


def export_zip_chunks(conversations):
    buffer = ZipStreamBuffer()
    seen = {}
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        for conversation in conversations:
            prefix = f'conversation-{conversation.conversation_id}'
            count = seen.get(prefix, 0) + 1
            seen[prefix] = count
            if count > 1:
                prefix = f'{prefix}-{count}'
            for label, manager_cls in EXPORT_TABLES:
                manager_cls.write_csv_member(archive, f'{prefix}-{label}.csv', conversation)
                yield buffer.drain()
    yield buffer.drain()


def export_zip_response(conversations, filename):
    return BaseCSVExportManager.zip_streaming_response(export_zip_chunks(conversations), filename)
