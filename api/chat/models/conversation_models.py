from django.db import models
from django.conf import settings

from common.models import BaseModel


class ConversationModel(BaseModel):
    title = models.CharField(max_length=255, blank=True, null=True)

    conversation_id = models.CharField(max_length=255)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, related_name='conversations'
    )

    model_name = models.CharField(max_length=512, blank=True, null=True)
    timezone = models.CharField(max_length=100, default='UTC')
    is_deleted = models.BooleanField(default=False)
    cohort = models.ForeignKey(
        'cohort.Cohort',
        on_delete=models.SET_NULL,
        related_name='conversations',
        blank=True,
        null=True
    )

    class Meta:
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"
        db_table = "conversation"
        ordering = ["-created_at"]