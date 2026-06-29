import pytest
from django.urls import reverse
from rest_framework import status

from utils.configuration.models import EmailConfiguration
from utils.configuration.resolver import resolve_email_config

BASE_URL = reverse('emailconfiguration-list')


def detail_url(pk):
    return reverse('emailconfiguration-detail', kwargs={'pk': pk})


def activate_url(pk):
    return reverse('emailconfiguration-activate', kwargs={'pk': pk})


def send_test_url(pk):
    return reverse('emailconfiguration-send-test-email', kwargs={'pk': pk})


def payload(**overrides):
    data = {
        'name': 'Primary',
        'email_host': 'smtp.example.com',
        'email_port': 587,
        'email_host_user': 'user@example.com',
        'password': 'secret-password',
        'default_from_email': 'no-reply@example.com',
        'is_active': True,
    }
    data.update(overrides)
    return data


@pytest.mark.django_db
class TestEmailConfigurationPermissions:

    @pytest.mark.parametrize("user_fixture, expected_status", [
        ("admin_user", status.HTTP_201_CREATED),
        ("researcher_user", status.HTTP_403_FORBIDDEN),
    ])
    def test_create_requires_admin(self, api_client, request, user_fixture, expected_status):
        api_client.force_authenticate(user=request.getfixturevalue(user_fixture))
        response = api_client.post(BASE_URL, payload(), format='json')
        assert response.status_code == expected_status

    def test_anonymous_cannot_list(self, api_client):
        response = api_client.get(BASE_URL)
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


@pytest.mark.django_db
class TestEmailConfigurationCreate:

    def test_password_is_encrypted_and_hidden(self, admin_client):
        response = admin_client.post(BASE_URL, payload(), format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert 'password' not in response.data
        assert response.data['has_password'] is True

        config = EmailConfiguration.objects.get(id=response.data['id'])
        assert config.email_host_password != 'secret-password'
        assert config.password == 'secret-password'

    def test_creating_active_deactivates_others(self, admin_client):
        first = admin_client.post(BASE_URL, payload(name='First'), format='json').data
        second = admin_client.post(BASE_URL, payload(name='Second'), format='json').data

        assert EmailConfiguration.objects.get(id=first['id']).is_active is False
        assert EmailConfiguration.objects.get(id=second['id']).is_active is True
        assert EmailConfiguration.objects.filter(is_active=True).count() == 1

    def test_password_is_required(self, admin_client):
        data = payload()
        data.pop('password')
        response = admin_client.post(BASE_URL, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data

    def test_tls_and_ssl_are_mutually_exclusive(self, admin_client):
        response = admin_client.post(
            BASE_URL, payload(email_use_tls=True, email_use_ssl=True), format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestEmailConfigurationUpdate:

    def test_password_unchanged_when_omitted(self, admin_client):
        created = admin_client.post(BASE_URL, payload(), format='json').data
        stored = EmailConfiguration.objects.get(id=created['id']).email_host_password

        response = admin_client.patch(detail_url(created['id']), {'name': 'Renamed'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Renamed'
        assert EmailConfiguration.objects.get(id=created['id']).email_host_password == stored


@pytest.mark.django_db
class TestEmailConfigurationActivate:

    def test_activate_switches_active_configuration(self, admin_client):
        first = admin_client.post(BASE_URL, payload(name='First'), format='json').data
        second = admin_client.post(BASE_URL, payload(name='Second', is_active=False), format='json').data

        response = admin_client.post(activate_url(first['id']))
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_active'] is True
        assert EmailConfiguration.objects.get(id=second['id']).is_active is False
        assert EmailConfiguration.objects.filter(is_active=True).count() == 1


@pytest.mark.django_db
class TestEmailConfigurationResolver:

    def test_active_configuration_takes_priority(self, admin_user):
        config = EmailConfiguration(
            name='Active',
            email_host='smtp.active.com',
            email_port=2525,
            email_host_user='user',
            default_from_email='from@active.com',
            is_active=True,
        )
        config.password = 'pw'
        config.save()

        resolved = resolve_email_config()
        assert resolved['host'] == 'smtp.active.com'
        assert resolved['port'] == 2525
        assert resolved['password'] == 'pw'

    def test_falls_back_to_settings_when_none_active(self, db, settings):
        settings.EMAIL_HOST = 'smtp.env.com'
        resolved = resolve_email_config()
        assert resolved['host'] == 'smtp.env.com'


@pytest.mark.django_db
class TestEmailConfigurationSendTest:

    def test_send_test_email_invokes_manager(self, admin_client, mocker):
        created = admin_client.post(BASE_URL, payload(), format='json').data
        manager = mocker.patch('utils.configuration.views.EmailManager')
        manager.return_value.send_test_email.return_value = True

        response = admin_client.post(send_test_url(created['id']), {}, format='json')
        assert response.status_code == status.HTTP_200_OK
        manager.return_value.send_test_email.assert_called_once()
