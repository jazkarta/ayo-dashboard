from django.db import models

from common.models import BaseModel

from .conversation_models import ConversationModel


class Chat(BaseModel):
    conversation = models.ForeignKey(
        ConversationModel,
        on_delete=models.CASCADE, related_name='chats'
    )
    prompt = models.TextField()
    response = models.TextField()

    class Meta:
        verbose_name = "Chat"
        verbose_name_plural = "Chats"
        db_table = "chat"