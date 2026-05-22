EXPORT_FIELD_VALUES = {
    'conversation_id': lambda conv, chat: conv.conversation_id,
    'model_name':      lambda conv, chat: conv.model_name or '',
    'username':        lambda conv, chat: conv.user.username or '',
    'family_id':       lambda conv, chat: getattr(getattr(conv.user, 'participant_profile', None), 'family_id', None) or '',
    'cohort_id':       lambda conv, chat: str(conv.cohort_id) if conv.cohort_id else '',
    'message_date':    lambda conv, chat: chat.created_at.isoformat(),
    'prompt':          lambda conv, chat: chat.prompt,
    'response':        lambda conv, chat: chat.response,
    'attachment_urls': lambda conv, chat: '',
}

BULK_EXPORT_FIELD_VALUES = {
    'conversation_id':  lambda conv, chat: conv.conversation_id,
    'model_name':       lambda conv, chat: conv.model_name or '',
    'username':         lambda conv, chat: conv.user.username or '',
    'family_id':        lambda conv, chat: getattr(getattr(conv.user, 'participant_profile', None), 'family_id', None) or '',
    'cohort_id':        lambda conv, chat: str(conv.cohort_id) if conv.cohort_id else '',
    'prompts':          lambda conv, chat: chat.prompt or '',
    'responses':        lambda conv, chat: chat.response or '',
    'attachment_urls':  lambda conv, chat: '',
}
