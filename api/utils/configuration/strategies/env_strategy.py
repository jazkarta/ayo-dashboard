from typing import Optional

from django.conf import settings

from .base import EmailConfigurationStrategy


class EnvEmailConfigurationStrategy(EmailConfigurationStrategy):
    def get_config(self) -> Optional[dict]:
        return {
            'backend': settings.EMAIL_BACKEND,
            'host': settings.EMAIL_HOST,
            'port': settings.EMAIL_PORT,
            'username': settings.EMAIL_HOST_USER,
            'password': settings.EMAIL_HOST_PASSWORD,
            'use_tls': settings.EMAIL_USE_TLS,
            'use_ssl': getattr(settings, 'EMAIL_USE_SSL', False),
            'from_email': settings.DEFAULT_FROM_EMAIL,
        }
