from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class TimezoneMixin:
    def get_request_timezone(self):
        tz_str = self.request.META.get('HTTP_X_TIMEZONE', 'UTC')
        try:
            ZoneInfo(tz_str)
            return tz_str
        except (ZoneInfoNotFoundError, KeyError):
            return 'UTC'

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['timezone'] = self.get_request_timezone()
        return context
