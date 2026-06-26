from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from chat.models import GuardrailRule
from participant.models import ParticipantProfile

User = get_user_model()

GUARDRAILS_URL = reverse('chat-guardrails')


def dob_for_age(age):
    today = date.today()
    try:
        return today.replace(year=today.year - age)
    except ValueError:
        return today.replace(year=today.year - age, day=28)


@pytest.mark.django_db
class TestParticipantGuardrails:

    def _participant(self, age):
        user = User.objects.create_user(email=f'p{age}@example.com', password='password123')
        ParticipantProfile.objects.create(
            user=user, date_of_birth=dob_for_age(age), family_id=f'FAM-{age}'
        )
        return user

    def test_returns_guardrails_for_matching_rule(self, api_client):
        GuardrailRule.objects.create(min_age=5, max_age=12, guardrails={'g1': 'Guardrail 1', 'g2': 'Guardrail 2'})
        api_client.force_authenticate(self._participant(8))

        response = api_client.get(GUARDRAILS_URL)

        assert response.status_code == 200
        assert response.data == {'guardrails': ['g1', 'g2']}

    def test_unions_and_dedupes_overlapping_rules(self, api_client):
        GuardrailRule.objects.create(min_age=5, max_age=10, guardrails={'g1': 'Guardrail 1', 'g2': 'Guardrail 2'})
        GuardrailRule.objects.create(min_age=8, max_age=15, guardrails={'g2': 'Guardrail 2', 'g3': 'Guardrail 3'})
        api_client.force_authenticate(self._participant(9))

        response = api_client.get(GUARDRAILS_URL)

        assert response.status_code == 200
        assert response.data['guardrails'] == ['g1', 'g2', 'g3']

    @pytest.mark.parametrize('age', [5, 12])
    def test_age_range_bounds_are_inclusive(self, api_client, age):
        GuardrailRule.objects.create(min_age=5, max_age=12, guardrails={'g1': 'Guardrail 1'})
        api_client.force_authenticate(self._participant(age))

        response = api_client.get(GUARDRAILS_URL)

        assert response.data['guardrails'] == ['g1']

    def test_returns_empty_when_no_rule_matches(self, api_client):
        GuardrailRule.objects.create(min_age=5, max_age=12, guardrails={'g1': 'Guardrail 1'})
        api_client.force_authenticate(self._participant(20))

        response = api_client.get(GUARDRAILS_URL)

        assert response.data == {'guardrails': []}

    def test_returns_empty_when_participant_has_no_profile(self, api_client):
        user = User.objects.create_user(email='noprofile@example.com', password='password123')
        GuardrailRule.objects.create(min_age=0, max_age=120, guardrails={'g1': 'Guardrail 1'})
        api_client.force_authenticate(user)

        response = api_client.get(GUARDRAILS_URL)

        assert response.data == {'guardrails': []}
