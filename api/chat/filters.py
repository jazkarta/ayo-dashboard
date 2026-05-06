import django_filters

from chat.models.conversation_models import ConversationModel


class ConversationFilter(django_filters.FilterSet):
    participant_username = django_filters.CharFilter(field_name='user__username', lookup_expr='iexact')
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='date__lte')
    turns_min = django_filters.NumberFilter(field_name='number_of_turns', lookup_expr='gte')
    turns_max = django_filters.NumberFilter(field_name='number_of_turns', lookup_expr='lte')

    class Meta:
        model = ConversationModel
        fields = ['participant_username', 'date_from', 'date_to', 'turns_min', 'turns_max']
