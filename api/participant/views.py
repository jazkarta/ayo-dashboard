import logging

from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .serializers import (
    ParticipantCreateSerializer, InvitationSerializer,
    InvitationAcceptSerializer, InvitationSendSerializer,
    UsernameSuggestionSerializer
)
from .permissions import IsResearcher
from .models import Invitation

from utils.username_generator_helper import get_suggested_usernames

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
    permission_classes = [IsResearcher]

    @action(detail=True, methods=['post'], serializer_class=InvitationSendSerializer)
    def invite(self, request, pk=None):
        """
        Send an invitation to a participant.
        """
        participant = self.get_object()
        serializer = self.get_serializer(data=request.data, context={
            'participant': participant
        })

        if serializer.is_valid():
            invitation = serializer.save(invited_by=request.user)
            logger.info(f"Invitation {invitation.id} created for participant {participant.username}")
            serializer = InvitationSerializer(invitation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='suggest-username', serializer_class=UsernameSuggestionSerializer)
    def suggest_username(self, request):
        """
        Get a list of suggested unique usernames.
        """
        count = request.query_params.get('count', 4)
        try:
            count = int(count)
        except (ValueError, TypeError):
            count = 4

        usernames = get_suggested_usernames(count=count)
        return Response({"usernames": usernames}, status=status.HTTP_200_OK)


class InvitationViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    ViewSet for handling invitation details and acceptance.
    """
    queryset = Invitation.objects.all()
    serializer_class = InvitationSerializer
    permission_classes = []

    @action(detail=True, methods=['post'], serializer_class=InvitationAcceptSerializer)
    def accept(self, request, pk=None):
        """
        Accept an invitation, activating the user and marking it as accepted.
        """
        invitation = self.get_object()
        invitation_accept_serializer = self.serializer_class(
            data=request.data, context={'invitation': invitation}
        )

        if invitation_accept_serializer.is_valid():
            invitation = invitation_accept_serializer.save()
            logger.info(f"Invitation {invitation.id} accepted")

            serializer = InvitationSerializer(invitation)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(
            invitation_accept_serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
