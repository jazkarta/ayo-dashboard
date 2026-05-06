from django.db import models

from common.models import BaseModel

from .conversation_models import ConversationModel


class Chat(BaseModel):
    ERROR_RESPONSE_PREFIX = '[Error] An error occurred while processing the request'

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
        ordering = ["-created_at"]


class ChatMedia(BaseModel):
    filename = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    url = models.URLField(max_length=2048)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='media')

    class Meta:
        db_table = "chat_media"