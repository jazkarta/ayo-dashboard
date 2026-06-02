import logging

from django.conf import settings
from django.conf import settings
from django.utils import timezone
from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model
from users.models.user import UserRole
from utils.keycloak_manager import KeycloakSync
from .models import ParticipantProfile, Invitation, Guardian
from cohort.models import Cohort
from cohort.serializers import CohortReadSerializer
from utils.email_manager import EmailManager
from utils.username_generator_helper import generate_username
from rest_framework.validators import UniqueValidator

logger = logging.getLogger(__name__)

User = get_user_model()


class GuardianSerializer(serializers.ModelSerializer):

    class Meta:
        model = Guardian
        fields = ['first_name', 'last_name', 'phone_number', 'email', 'address', 'relationship']


class ParticipantProfileSerializer(serializers.ModelSerializer):
    guardian = GuardianSerializer(read_only=True)
    cohort = CohortReadSerializer(read_only=True)
    cohort_id = serializers.PrimaryKeyRelatedField(
        source='cohort',
        queryset=Cohort.objects.all(),
        allow_null=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = ParticipantProfile
        fields = ['date_of_birth', 'gender', 'family_id', 'demographics', 'guardian', 'cohort', 'cohort_id']
        read_only_fields = ['guardian', 'cohort']

    def validate_date_of_birth(self, value):
        if value >= timezone.now().date():
            raise serializers.ValidationError("Date of birth must be in the past.")
        return value

    def validate_gender(self, value):
        valid_genders = [choice[0] for choice in ParticipantProfile.GENDER_CHOICES]
        if value not in valid_genders:
            raise serializers.ValidationError(f"Invalid gender. Valid choices are: {', '.join(valid_genders)}")
        return value


class ParticipantCreateSerializer(serializers.ModelSerializer):
    profile_data = ParticipantProfileSerializer(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'is_active', 'profile_data']
        read_only_fields = ['id', 'is_active', 'username']
        extra_kwargs = {
            "email": {
                "required": True,
                "validators": [
                    UniqueValidator(
                        queryset=User.objects.all(),
                        lookup="iexact"
                    )
                ]
            },
            "first_name": {"required": False, "allow_blank": True, "allow_null": True},
            "last_name": {"required": False, "allow_blank": True, "allow_null": True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance:
            self.fields['email'].read_only = True

    def validate_email(self, value):
        return value.strip().lower()


    @transaction.atomic
    def create(self, validated_data):
        profile_data = validated_data.pop('profile_data')

        # Create user with PARTICIPANT role
        user = User.objects.create(
            role=UserRole.PARTICIPANT,
            is_active=False,
            **validated_data
        )
        
        # Create profile
        ParticipantProfile.objects.create(
            user=user,
            **profile_data
        )
        
        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile_data', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update profile fields
        if profile_data:
            profile = getattr(instance, 'participant_profile', None)
            if profile:
                for attr, value in profile_data.items():
                    setattr(profile, attr, value)
                profile.save()
            else:
                ParticipantProfile.objects.create(user=instance, **profile_data)
        
        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        profile = getattr(instance, 'participant_profile', None)
        if profile:
            representation['profile_data'] = ParticipantProfileSerializer(profile).data
        else:
            representation['profile_data'] = {}
        return representation


class ParticipantListSerializer(ParticipantCreateSerializer):

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        try:
            invitation = instance.invitations
            if not invitation.has_accepted:
                representation['invitation_link'] = (
                    f"{settings.DASHBOARD_URL}/invitation/{invitation.id}/accept"
                )
            else:
                representation['invitation_link'] = None
        except Invitation.DoesNotExist:
            representation['invitation_link'] = None
        return representation


class ParticipantListSerializer(ParticipantCreateSerializer):

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        try:
            invitation = instance.invitations
            if not invitation.has_accepted:
                representation['invitation_link'] = (
                    f"{settings.DASHBOARD_URL}/invitation/{invitation.id}/accept"
                )
            else:
                representation['invitation_link'] = None
        except Invitation.DoesNotExist:
            representation['invitation_link'] = None
        return representation


class ParticipantEmailCheckSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "User with this email address already exists."
            )
        return value


class InvitationSerializer(serializers.ModelSerializer):
    user = ParticipantCreateSerializer(read_only=True)

    class Meta:
        model = Invitation
        fields = [
            'id', 'user', 'invited_by',
            'expiry_date', 'is_active', 'created_at',
            'has_accepted', 'parent_email'
        ]
        read_only_fields = [
            'id', 'user', 'invited_by',
            'is_active', 'created_at'
        ]

class InvitationSendSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate(self, attrs):
        participant = self.context['participant']

        if participant.is_active:
            return serializers.ValidationError("User is already active.")

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        participant = self.context['participant']
        email_manager = EmailManager()

        try:
            participant.invitations.delete()
        except Invitation.DoesNotExist:
            logger.info(f"No existing invitation for user {participant.username} to delete.")

        # Create new invitation
        expiry_date = timezone.now() + timezone.timedelta(days=2)
        invitation = Invitation.objects.create(
            user=participant,
            invited_by=validated_data['invited_by'],
            expiry_date=expiry_date,
            parent_email=validated_data['email'],
        )

        # send email to guardian
        context = {
            "invited_by": validated_data['invited_by'].get_full_name(),
            "expiry_date": expiry_date.strftime("%Y-%m-%d %H:%M"),
            "invitation_id": invitation.id,
        }

        # Send the email using EmailManager
        email_manager.send_participant_invitation_email(
            to_email=invitation.parent_email, invitation_data=context
        )

        return invitation

class InvitationResendSerializer(serializers.Serializer):

    def validate(self, attrs):
        participant = self.context['participant']
        try:
            invitation = participant.invitations
        except Invitation.DoesNotExist:
            raise serializers.ValidationError("No invitation found for this participant.")

        if invitation.has_accepted:
            raise serializers.ValidationError("Invitation has already been accepted.")

        return attrs

    def save(self, **kwargs):
        participant = self.context['participant']
        invitation = participant.invitations
        email_manager = EmailManager()

        if invitation.expiry_date < timezone.now():
            invitation.expiry_date = timezone.now() + timezone.timedelta(days=2)
            invitation.save(update_fields=['expiry_date', 'updated_at'])

        context = {
            "invited_by": invitation.invited_by.get_full_name(),
            "expiry_date": invitation.expiry_date.strftime("%Y-%m-%d %H:%M"),
            "invitation_id": invitation.id,
        }

        email_manager.send_participant_invitation_email(
            to_email=invitation.parent_email, invitation_data=context
        )

        return invitation

    def to_representation(self, instance):
        return InvitationSerializer(instance, context=self.context).data


class InvitationAcceptSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, required=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate(self, attrs):
        invitation = self.context['invitation']

        if invitation.has_accepted:
            raise serializers.ValidationError("Invitation already accepted.")
        if invitation.expiry_date < timezone.now():
            raise serializers.ValidationError("Invitation has expired.")
        if not invitation.is_active:
            raise serializers.ValidationError("Invitation is no longer active.")

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        invitation = self.context['invitation']
        keycloak_manager = KeycloakSync()

        # Update invitation status
        invitation.has_accepted = True
        invitation.is_active = False
        invitation.save()

        logger.info(f"Invitation {invitation.id} accepted by user {invitation.user.username}")

        # Activate the user
        user = invitation.user
        user.username = validated_data['username']
        # user.username = validated_data['username'].lower()

        keycloak_id = keycloak_manager.create_user(
            user.username, user.email,
            user.first_name, user.last_name, user.role
        )

        user.keycloak_id = keycloak_id
        user.is_active = True
        user.save()
        logger.info(f"User {user.username} created in Keycloak with role {user.role}")

        return invitation


class UsernameSuggestionSerializer(serializers.Serializer):
    usernames = serializers.ListField(child=serializers.CharField())

