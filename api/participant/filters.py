import django_filters

from django.contrib.auth import get_user_model

User = get_user_model()


class ParticipantFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter(field_name='is_active')
    cohort_id = django_filters.UUIDFilter(field_name='participant_profile__cohort_id')

    class Meta:
        model = User
        fields = ['is_active', 'cohort_id']
