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
    is_deleted = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"
        db_table = "conversation"
        ordering = ["-created_at"]