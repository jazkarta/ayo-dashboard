from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class Cohort(BaseModel):
    name = models.CharField(_('name'), max_length=50)
    description = models.TextField(_('description'), blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cohorts'
    )

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'cohort'
        verbose_name = _('Cohort')
        verbose_name_plural = _('Cohorts')
        ordering = ['-created_at']
