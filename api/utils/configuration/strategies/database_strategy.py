from typing import Optional

from utils.configuration.models import EmailConfiguration

from .base import EmailConfigurationStrategy

SMTP_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'


class DatabaseEmailConfigurationStrategy(EmailConfigurationStrategy):
    def __init__(self, config: Optional[EmailConfiguration] = None):
        self._config = config

    def get_config(self) -> Optional[dict]:
        config = self._config or EmailConfiguration.objects.filter(is_active=True).first()
        if not config:
            return None
        return {
            'backend': SMTP_BACKEND,
            'host': config.email_host,
            'port': config.email_port,
            'username': config.email_host_user,
            'password': config.password,
            'use_tls': config.email_use_tls,
            'use_ssl': config.email_use_ssl,
            'from_email': config.default_from_email,
        }
