from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel
from utils.configuration.encryption import decrypt_value, encrypt_value


class EmailConfiguration(BaseModel):
    name = models.CharField(_('name'), max_length=100)
    email_host = models.CharField(_('email host'), max_length=255)
    email_port = models.PositiveIntegerField(_('email port'), default=587)
    email_use_tls = models.BooleanField(_('use TLS'), default=True)
    email_use_ssl = models.BooleanField(_('use SSL'), default=False)
    email_host_user = models.CharField(_('email host user'), max_length=255)
    email_host_password = models.TextField(_('email host password'))
    default_from_email = models.EmailField(_('default from email'))
    is_active = models.BooleanField(_('is active'), default=False)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_configurations',
    )

    class Meta:
        db_table = 'email_configuration'
        verbose_name = _('Email Configuration')
        verbose_name_plural = _('Email Configurations')
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.email_host_password and not self._is_encrypted(self.email_host_password):
            self.email_host_password = encrypt_value(self.email_host_password)
        super().save(*args, **kwargs)

    @staticmethod
    def _is_encrypted(value: str) -> bool:
        try:
            decrypt_value(value)
            return True
        except Exception:
            return False

    @property
    def password(self) -> str:
        if not self.email_host_password:
            return ''
        try:
            return decrypt_value(self.email_host_password)
        except Exception:
            return self.email_host_password

    @password.setter
    def password(self, raw_password: str):
        self.email_host_password = raw_password or ''

    @property
    def has_password(self) -> bool:
        return bool(self.email_host_password)
