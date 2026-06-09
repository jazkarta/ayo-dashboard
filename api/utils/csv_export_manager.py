import csv
import io

from django.http import StreamingHttpResponse


class _Echo:
    def write(self, value):
        return value


class BaseCSVExportManager:

    CSV_HEADERS = []

    @classmethod
    def rows(cls, queryset):
        raise NotImplementedError

    @classmethod
    def per_conversation_rows(cls, conversation):
        raise NotImplementedError

    @classmethod
    def streaming_response(cls, queryset, filename):
        writer = csv.writer(_Echo())
        response = StreamingHttpResponse(
            (writer.writerow(row) for row in cls.rows(queryset)),
            content_type='text/csv',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @staticmethod
    def combined_rows(sections):
        queryset = sections[0][2]
        for conv_idx, conversation in enumerate(queryset):
            if conv_idx > 0:
                yield []
            for sec_idx, (label, manager_cls, _) in enumerate(sections):
                if sec_idx > 0:
                    yield []
                yield [label]
                yield manager_cls.CSV_HEADERS
                yield from manager_cls.per_conversation_rows(conversation)

    @staticmethod
    def combined_to_buffer(sections):
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        for row in BaseCSVExportManager.combined_rows(sections):
            writer.writerow(row)
        return buffer

    @staticmethod
    def combined_streaming_response(sections, filename):
        writer = csv.writer(_Echo())
        response = StreamingHttpResponse(
            (writer.writerow(row) for row in BaseCSVExportManager.combined_rows(sections)),
            content_type='text/csv',
        )
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
