import csv
import io
import json
import tempfile
import zipfile
from zoneinfo import ZoneInfo

from utils.csv_export_manager import BaseCSVExportManager, ZipStreamBuffer

_SPOOL_MAX_BYTES = 16 * 1024 * 1024
_DRAIN_EVERY_ROWS = 500


class ChatExportManager(BaseCSVExportManager):

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
                chat.created_at.astimezone(tz).strftime('%Y-%m-%d %H:%M:%S'),
                chat.prompt,
                chat.response,
                json.dumps(chat.metadata, indent=4) if chat.metadata else '',
                '|'.join(media.url for media in chat.media.all()),
            ]


class ConversationExportManager(BaseCSVExportManager):

    CSV_HEADERS = [
        'conversation_id', 'model_name', 'username',
        'family_id', 'cohort_id', 'number_of_turns',
        'created_at', 'attachment_urls',
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
            conversation.number_of_turns,
            conversation.created_at.astimezone(tz).strftime('%Y-%m-%d %H:%M:%S'),
            # f"{conversation.created_at.astimezone(tz).strftime('%B %d, %Y, %I:%M %p')} ({tz_name})",
            '|'.join(attachment_urls),
        ]


def export_zip_chunks(conversations):
    buffer = ZipStreamBuffer()

    with tempfile.SpooledTemporaryFile(max_size=_SPOOL_MAX_BYTES) as spool:
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
            with archive.open('turns.csv', mode='w') as member:
                with io.TextIOWrapper(member, encoding='utf-8', newline='') as turns_text:
                    turns_writer = csv.writer(turns_text)
                    turns_writer.writerow(ChatExportManager.CSV_HEADERS)

                    spool_wrapper = io.TextIOWrapper(spool, encoding='utf-8', newline='', write_through=True)
                    spool_writer = csv.writer(spool_wrapper)
                    spool_writer.writerow(ConversationExportManager.CSV_HEADERS)

                    row_count = 0
                    for conversation in conversations:
                        spool_writer.writerows(ConversationExportManager.per_conversation_rows(conversation))
                        for row in ChatExportManager.per_conversation_rows(conversation):
                            turns_writer.writerow(row)
                            row_count += 1
                            if row_count % _DRAIN_EVERY_ROWS == 0:
                                turns_text.flush()
                                yield buffer.drain()

                    turns_text.flush()
                    yield buffer.drain()
                    spool_wrapper.detach()

            spool.seek(0)
            with archive.open('conversations.csv', mode='w') as member:
                with io.TextIOWrapper(member, encoding='utf-8', newline='') as conv_text:
                    spool_reader = io.TextIOWrapper(spool, encoding='utf-8', newline='')
                    for i, line in enumerate(spool_reader, start=1):
                        conv_text.write(line)
                        if i % _DRAIN_EVERY_ROWS == 0:
                            conv_text.flush()
                            yield buffer.drain()
                    conv_text.flush()
                    yield buffer.drain()
                    spool_reader.detach()

    yield buffer.drain()


def export_zip_response(conversations, filename):
    return BaseCSVExportManager.zip_streaming_response(export_zip_chunks(conversations), filename)
