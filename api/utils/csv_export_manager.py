import csv

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
    def streaming_response(cls, queryset, filename):
        writer = csv.writer(_Echo())
        response = StreamingHttpResponse(
            (writer.writerow(row) for row in cls.rows(queryset)),
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
