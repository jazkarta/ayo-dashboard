from django.db import transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from participant.models import ParticipantProfile
from researcher.serializers import ResearcherReadSerializer
from .models import Cohort


class CohortParticipantSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ParticipantProfile
        fields = ['id', 'email', 'first_name', 'last_name', 'username', 'family_id', 'date_of_birth', 'gender']
        read_only_fields = fields


class CohortReadSerializer(serializers.ModelSerializer):
    created_by = ResearcherReadSerializer(read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Cohort
        fields = ['id', 'name', 'description', 'created_by', 'participant_count', 'created_at', 'updated_at']
        read_only_fields = fields

    def get_participant_count(self, obj):
        return obj.participants.count()


class CohortDetailSerializer(CohortReadSerializer):
    participants = CohortParticipantSerializer(many=True, read_only=True)

    class Meta(CohortReadSerializer.Meta):
        fields = CohortReadSerializer.Meta.fields + ['participants']
        read_only_fields = fields


class CohortCreateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        max_length=50,
        validators=[UniqueValidator(queryset=Cohort.objects.all(), lookup='iexact', message='A cohort with this name already exists.')],
    )

    class Meta:
        model = Cohort
        fields = ['id', 'name', 'description']
        read_only_fields = ['id']

    @transaction.atomic
    def create(self, validated_data):
        return Cohort.objects.create(**validated_data)

    def to_representation(self, instance):
        return CohortReadSerializer(instance, context=self.context).data


class CohortUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        max_length=50,
        required=False,
        validators=[UniqueValidator(queryset=Cohort.objects.all(), lookup='iexact', message='A cohort with this name already exists.')],
    )

    class Meta:
        model = Cohort
        fields = ['name', 'description']

    @transaction.atomic
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def to_representation(self, instance):
        return CohortReadSerializer(instance, context=self.context).data
