from django.utils import timezone
from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model
from users.models.user import UserRole
from .models import ParticipantProfile, Invitation

from utils.username_generator_helper import generate_username

User = get_user_model()

class ParticipantProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParticipantProfile
        fields = ['date_of_birth', 'gender', 'demographics']
        extra_kwargs = {
            'date_of_birth': {'required': True},
            'gender': {'required': True},
        }

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
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile_data']
        read_only_fields = ['username', 'id']
        extra_kwargs = {
            'email': {'required': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance:
            self.fields['email'].read_only = True

    def __generate_participant_username(self) -> str:
        while True:
            username = generate_username()
            if not User.objects.filter(username=username).exists():
                return username

    @transaction.atomic
    def create(self, validated_data):
        profile_data = validated_data.pop('profile_data')

        username = self.__generate_participant_username()
        
        # Create user with PARTICIPANT role
        user = User.objects.create(
            role=UserRole.PARTICIPANT,
            username=username,
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


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ['id', 'user', 'invited_by', 'expiry_date', 'is_active', 'created_at']
        read_only_fields = ['id', 'user', 'invited_by', 'is_active', 'created_at']
