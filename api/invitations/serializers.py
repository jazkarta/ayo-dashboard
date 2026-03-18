from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import Invitation

class InviteParticipantSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class VerifyInvitationSerializer(serializers.Serializer):
    token = serializers.UUIDField()

    def validate(self, attrs):
        token = attrs["token"]
        invitation = Invitation.objects.select_related("participant__user").filter(token=token).first()
        if not invitation or not invitation.is_valid():
            raise serializers.ValidationError("Invalid or expired invitation")
        attrs["invitation"] = invitation
        return attrs


class AcceptInvitationSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        token = attrs["token"]
        invitation = Invitation.objects.select_related("participant__user").filter(token=token).first()
        if not invitation or not invitation.is_valid():
            raise serializers.ValidationError("Invalid or expired invitation")
        validate_password(attrs["password"], invitation.participant.user)
        attrs["invitation"] = invitation
        return attrs