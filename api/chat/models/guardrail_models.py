from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class GuardrailRule(BaseModel):
    min_age = models.PositiveSmallIntegerField(_('minimum age'))
    max_age = models.PositiveSmallIntegerField(_('maximum age'))
    guardrails = models.JSONField(default=list)

    class Meta:
        verbose_name = "Guardrail Rule"
        verbose_name_plural = "Guardrail Rules"
        db_table = "guardrail_rule"
        ordering = ["min_age", "max_age"]
