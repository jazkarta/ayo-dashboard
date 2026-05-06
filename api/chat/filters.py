from datetime import date, timedelta

import django_filters

from chat.models.conversation_models import ConversationModel


class ConversationFilter(django_filters.FilterSet):
    participant_username = django_filters.CharFilter(field_name='user__username', lookup_expr='iexact')
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='date__lte')
    turns_min = django_filters.NumberFilter(field_name='number_of_turns', lookup_expr='gte')
    turns_max = django_filters.NumberFilter(field_name='number_of_turns', lookup_expr='lte')
    participant_age = django_filters.NumberFilter(method='filter_by_participant_age')

    class Meta:
        model = ConversationModel
        fields = ['participant_username', 'date_from', 'date_to', 'turns_min', 'turns_max', 'participant_age']

    def filter_by_participant_age(self, queryset, name, value):
        age = int(value)
        today = date.today()
        try:
            dob_max = today.replace(year=today.year - age)
        except ValueError:
            dob_max = today.replace(year=today.year - age, day=28)
        try:
            dob_min = today.replace(year=today.year - age - 1) + timedelta(days=1)
        except ValueError:
            dob_min = today.replace(year=today.year - age - 1, day=28) + timedelta(days=1)
        return queryset.filter(
            user__participant_profile__date_of_birth__range=(dob_min, dob_max)
        )
