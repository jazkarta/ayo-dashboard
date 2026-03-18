from rest_framework import generics, status
from rest_framework.response import Response
from django.utils import timezone
from .serializers import (
    InviteParticipantSerializer,
    VerifyInvitationSerializer,
    AcceptInvitationSerializer
)
from .services import ParticipantInviter

class InviteParticipantView(generics.CreateAPIView):
    serializer_class = InviteParticipantSerializer

    def perform_create(self, serializer):
        data = serializer.validated_data
        ParticipantInviter(**data).invite()


class VerifyInvitationView(generics.GenericAPIView):
    serializer_class = VerifyInvitationSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = serializer.validated_data["invitation"]
        return Response({
            "valid": True,
            "email": invitation.participant.user.email,
            "first_name": invitation.participant.user.first_name
        })


class AcceptInvitationView(generics.CreateAPIView):
    serializer_class = AcceptInvitationSerializer

    def perform_create(self, serializer):
        invitation = serializer.validated_data["invitation"]
        user = invitation.participant.user
        participant = invitation.participant

        user.set_password(serializer.validated_data["password"])
        user.is_active = True
        user.save()

        participant.has_accepted = True
        participant.accepted_at = timezone.now()
        participant.save()

        invitation.is_used = True
        invitation.save()