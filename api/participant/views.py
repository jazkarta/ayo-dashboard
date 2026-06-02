import logging

from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, status, mixins, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .serializers import (
    ParticipantCreateSerializer, ParticipantListSerializer,
    InvitationSerializer, InvitationAcceptSerializer,
    InvitationSendSerializer, InvitationResendSerializer,
    UsernameSuggestionSerializer, ParticipantEmailCheckSerializer
)
from .filters import ParticipantFilter
from .permissions import IsResearcher
from .models import Invitation

from utils.username_generator_helper import get_suggested_usernames

from users.models import UserRole

User = get_user_model()
logger = logging.getLogger(__name__)

_PARTICIPANT_FILTER_PARAMS = [
    openapi.Parameter('is_active', openapi.IN_QUERY, type=openapi.TYPE_BOOLEAN, description='Filter by active status'),
    openapi.Parameter('cohort_id', openapi.IN_QUERY, type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, description='Filter by cohort UUID'),
    openapi.Parameter('search', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Search by username or email'),
    openapi.Parameter('ordering', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Order by field. Prefix with `-` for descending. Options: username, email, date_joined'),
]


class ParticipantViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing participant accounts.
    Only Researchers can create participants.
    """
    serializer_class = ParticipantCreateSerializer
    permission_classes = [IsResearcher]
    queryset = (
        User.objects
        .filter(role=UserRole.PARTICIPANT)
        .select_related('invitations', 'participant_profile')
        .order_by('-date_joined')
    )

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ParticipantFilter
    search_fields = ['username', 'email']
    ordering_fields = ['username', 'email', 'date_joined']

    def get_serializer_class(self):
        if self.action == 'list':
            return ParticipantListSerializer
        return super().get_serializer_class()

    @swagger_auto_schema(manual_parameters=_PARTICIPANT_FILTER_PARAMS)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'email',
                openapi.IN_QUERY,
                description="Email to check availability",
                type=openapi.TYPE_STRING,
                required=True,
            ),
        ],
        responses={200: "Email available"}
    )
    @action(detail=False, methods=["get"], url_path="check-email")
    def check_email(self, request):
        serializer = ParticipantEmailCheckSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        return Response({"detail": "Email is available"}, status=status.HTTP_200_OK)

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

    @swagger_auto_schema(
        request_body=openapi.Schema(type=openapi.TYPE_OBJECT),
        responses={200: InvitationSerializer}
    )
    @action(detail=True, methods=['post'], url_path='resend-invite', serializer_class=InvitationResendSerializer)
    def resend_invite(self, request, pk=None):
        """
        Resend an invitation email to a participant's guardian using the existing invitation link.
        Resets the expiry date if the invitation has expired.
        """
        participant = self.get_object()
        serializer = self.get_serializer(data={}, context={'participant': participant})

        if serializer.is_valid():
            invitation = serializer.save()
            logger.info(f"Invitation {invitation.id} resent for participant {participant.username}")
            return Response(InvitationSerializer(invitation).data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=False, methods=['get'],
        url_path='suggest-username',
        serializer_class=UsernameSuggestionSerializer,
        permission_classes=[AllowAny]
    )
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
    permission_classes = [AllowAny]

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
