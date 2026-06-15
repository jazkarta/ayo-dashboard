import csv
import io

from django.http import StreamingHttpResponse


class ZipStreamBuffer(io.RawIOBase):
    """Unseekable write sink for zipfile so archive bytes can be drained incrementally."""

    def __init__(self):
        self._chunks = []

    def writable(self):
        return True

    def write(self, value):
        self._chunks.append(bytes(value))
        return len(value)

    def drain(self):
        chunks, self._chunks = self._chunks, []
        return b''.join(chunks)


class BaseCSVExportManager:

    CSV_HEADERS = []

    @classmethod
    def per_conversation_rows(cls, conversation):
        raise NotImplementedError

    @staticmethod
    def zip_streaming_response(chunks, filename):
        response = StreamingHttpResponse(chunks, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @staticmethod
    def _participant_name(user):
        return (
            f"{user.first_name} {user.last_name}".strip()
            or user.username
        )

    @staticmethod
    def _family_id(user):
        profile = getattr(user, 'participant_profile', None)
        return profile.family_id if profile else ''
