from django.contrib import admin
from .models.conversation_models import ConversationModel
from .models.chat_models import Chat

class ChatInline(admin.TabularInline):
    model = Chat
    extra = 0
    fields = ('prompt', 'response', 'created_at')
    readonly_fields = ('created_at',)

@admin.register(ConversationModel)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'model_name', 'created_at')
    search_fields = ('title', 'user__username', 'conversation_id')
    inlines = [ChatInline]

@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'prompt', 'created_at')
    search_fields = ('prompt', 'response', 'conversation__title')
    list_filter = ('created_at',)
