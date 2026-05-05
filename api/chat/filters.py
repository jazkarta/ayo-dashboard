import django_filters

from chat.models.conversation_models import ConversationModel


class ConversationFilter(django_filters.FilterSet):
    model_name = django_filters.CharFilter(lookup_expr='iexact')
    participant_email = django_filters.CharFilter(field_name='user__email', lookup_expr='iexact')
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='date__lte')

    class Meta:
        model = ConversationModel
        fields = ['model_name', 'participant_email', 'date_from', 'date_to']
