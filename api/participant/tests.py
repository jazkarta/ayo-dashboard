from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from participant.models import Invitation, ParticipantProfile
from users.models import UserRole

User = get_user_model()

class InvitationTests(APITestCase):
    def setUp(self):
        # Create a researcher to send invitations
        self.researcher = User.objects.create_user(
            username='researcher',
            email='researcher@example.com',
            password='password123',
            role=UserRole.RESEARCHER
        )
        
        # Create a participant
        self.participant = User.objects.create_user(
            username='participant1',
            email='participant1@example.com',
            password='password123',
            role=UserRole.PARTICIPANT,
            is_active=False
        )
        ParticipantProfile.objects.create(
            user=self.participant,
            date_of_birth='1990-01-01',
            gender='M'
        )
        
        # Create an invitation
        self.invitation = Invitation.objects.create(
            user=self.participant,
            invited_by=self.researcher,
            expiry_date=timezone.now() + timedelta(days=2)
        )
        
        self.client.force_authenticate(user=self.researcher)

    def test_get_invitation_details(self):
        url = reverse('invitation-detail', args=[self.invitation.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.invitation.id))
        self.assertEqual(response.data['user']['username'], self.participant.username)
        self.assertIn('profile_data', response.data['user'])
        self.assertEqual(response.data['user']['profile_data']['gender'], 'M')

    def test_accept_invitation_success(self):
        url = reverse('invitation-accept', args=[self.invitation.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['has_accepted'])
        self.assertFalse(response.data['is_active'])
        
        # Verify user is activated
        self.participant.refresh_from_db()
        self.assertTrue(self.participant.is_active)
        
        # Verify invitation is accepted
        self.invitation.refresh_from_db()
        self.assertTrue(self.invitation.has_accepted)

    def test_accept_already_accepted_invitation(self):
        self.invitation.has_accepted = True
        self.invitation.save()
        
        url = reverse('invitation-accept', args=[self.invitation.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], "Invitation has already been accepted.")

    def test_accept_expired_invitation(self):
        self.invitation.expiry_date = timezone.now() - timedelta(hours=1)
        self.invitation.save()
        
        url = reverse('invitation-accept', args=[self.invitation.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], "Invitation has expired.")
