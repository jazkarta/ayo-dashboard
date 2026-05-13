import pytest
from django.urls import reverse
from rest_framework import status

from cohort.models import Cohort

BASE_URL = reverse('cohort-list')


def detail_url(pk):
    return reverse('cohort-detail', kwargs={'pk': pk})


@pytest.mark.django_db
class TestCohortCreate:

    @pytest.mark.parametrize("user_fixture, expected_status", [
        ("researcher_user", status.HTTP_201_CREATED),
        ("participant_user", status.HTTP_403_FORBIDDEN),
    ])
    def test_create_cohort_permissions(self, api_client, request, user_fixture, expected_status):
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user=user)
        response = api_client.post(BASE_URL, {"name": "New Cohort"}, format="json")
        assert response.status_code == expected_status

    def test_create_cohort_sets_created_by(self, api_client, researcher_user):
        api_client.force_authenticate(user=researcher_user)
        response = api_client.post(BASE_URL, {"name": "My Cohort", "description": "Desc"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        cohort = Cohort.objects.get(id=response.data["id"])
        assert cohort.created_by == researcher_user


@pytest.mark.django_db
class TestCohortList:

    def test_researcher_sees_only_own_cohorts(self, api_client, researcher_user, other_researcher):
        Cohort.objects.create(name="Mine", created_by=researcher_user)
        Cohort.objects.create(name="Theirs", created_by=other_researcher)
        api_client.force_authenticate(user=researcher_user)
        response = api_client.get(BASE_URL)
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["name"] == "Mine"


@pytest.mark.django_db
class TestCohortUpdate:

    def test_owner_can_update(self, api_client, researcher_user, cohort):
        api_client.force_authenticate(user=researcher_user)
        response = api_client.patch(detail_url(cohort.id), {"name": "Updated"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated"

    def test_non_owner_gets_404(self, api_client, other_researcher, cohort):
        api_client.force_authenticate(user=other_researcher)
        response = api_client.patch(detail_url(cohort.id), {"name": "Hijack"}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCohortDelete:

    def test_owner_can_delete(self, api_client, researcher_user, cohort):
        api_client.force_authenticate(user=researcher_user)
        response = api_client.delete(detail_url(cohort.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Cohort.objects.filter(id=cohort.id).exists()

    def test_non_owner_gets_404(self, api_client, other_researcher, cohort):
        api_client.force_authenticate(user=other_researcher)
        response = api_client.delete(detail_url(cohort.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND
