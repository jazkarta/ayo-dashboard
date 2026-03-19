import logging

from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .serializers import ParticipantCreateSerializer, InvitationSerializer
from .permissions import IsResearcher
from .models import Invitation

from users.models import UserRole

User = get_user_model()
logger = logging.getLogger(__name__)


class ParticipantViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing participant accounts.
    Only Researchers can create participants.
    """
    queryset = User.objects.filter(role=UserRole.PARTICIPANT)
    serializer_class = ParticipantCreateSerializer
    # permission_classes = [IsResearcher]

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """
        Send an invitation to a participant.
        """
        participant = self.get_object()

        # Validation: User is already active
        if participant.is_active:
            return Response(
                {"detail": "User is already active."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Limitation: delete previous invitations
        try:
            participant.invitations.delete()
        except Invitation.DoesNotExist:
            logger.info(f"No existing invitation for user {participant.username} to delete.")

        # Create new invitation
        expiry_date = timezone.now() + timedelta(days=2)  # Default 2 days
        invitation = Invitation.objects.create(
            user=participant,
            invited_by=request.user,
            expiry_date=expiry_date
        )

        serializer = InvitationSerializer(invitation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
