from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class GlobalConfiguration(BaseModel):
    web_search = models.BooleanField(_('web search'), default=False)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='global_configurations',
    )

    class Meta:
        db_table = 'global_configuration'
        verbose_name = _('Global Configuration')
        verbose_name_plural = _('Global Configuration')

    def __str__(self):
        return 'Global Configuration'

    @classmethod
    def load(cls) -> 'GlobalConfiguration':
        instance = cls.objects.first()
        if instance is None:
            instance = cls.objects.create()
        return instance
