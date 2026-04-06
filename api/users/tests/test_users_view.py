import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestCurrentUserView:

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def authenticated_client(self, api_client, db):
        user = User.objects.create_user(
            email="testuser@example.com",
            password="password123",
            first_name="Test",
            last_name="User"
        )
        api_client.force_authenticate(user=user)
        return api_client, user

    def test_get_current_user_success(self, authenticated_client):
        """Test that GET /api/users/me/ returns the correct user data."""
        client, user = authenticated_client
        response = client.get("/api/users/me/")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email
        assert response.data["first_name"] == user.first_name
        assert response.data["last_name"] == user.last_name

    def test_get_current_user_unauthenticated(self, api_client):
        """Test that unauthenticated requests to /api/users/me/ are rejected."""
        response = api_client.get("/api/users/me/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
