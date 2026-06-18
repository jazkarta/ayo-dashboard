import json
from zoneinfo import ZoneInfo

EXPORT_FIELD_VALUES = {
    'conversation_id': lambda conv, chat: conv.conversation_id,
    'turn_id':         lambda conv, chat: str(chat.id),
    'turn_index':      lambda conv, chat: 1,
    'model_name':      lambda conv, chat: conv.model_name or '',
    'username':        lambda conv, chat: conv.user.username or '',
    'family_id':       lambda conv, chat: getattr(getattr(conv.user, 'participant_profile', None), 'family_id', None) or '',
    'cohort_id':       lambda conv, chat: str(conv.cohort_id) if conv.cohort_id else '',
    'message_date':    lambda conv, chat: chat.created_at.astimezone(ZoneInfo(conv.timezone or 'UTC')).strftime('%B %d, %Y, %I:%M %p'),
    'prompt':          lambda conv, chat: chat.prompt,
    'response':        lambda conv, chat: chat.response,
    'metadata':        lambda conv, chat: json.dumps(chat.metadata, indent=4) if chat.metadata else '',
    'attachment_urls': lambda conv, chat: '',
}

BULK_EXPORT_FIELD_VALUES = {
    'conversation_id':  lambda conv, chat: conv.conversation_id,
    'model_name':       lambda conv, chat: conv.model_name or '',
    'username':         lambda conv, chat: conv.user.username or '',
    'family_id':        lambda conv, chat: getattr(getattr(conv.user, 'participant_profile', None), 'family_id', None) or '',
    'cohort_id':        lambda conv, chat: str(conv.cohort_id) if conv.cohort_id else '',
    'number_of_turns':  lambda conv, chat: str(conv.chats.count()),
    'datetime':         lambda conv, chat: f"{conv.created_at.astimezone(ZoneInfo(conv.timezone or 'UTC')).strftime('%B %d, %Y, %I:%M %p')} ({conv.timezone or 'UTC'})",
    'attachment_urls':  lambda conv, chat: '',
}

