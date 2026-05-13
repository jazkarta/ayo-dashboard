from django.db import transaction
from rest_framework import serializers

from .models import Cohort


class CohortReadSerializer(serializers.ModelSerializer):
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Cohort
        fields = ['id', 'name', 'description', 'created_by', 'participant_count', 'created_at', 'updated_at']
        read_only_fields = fields

    def get_participant_count(self, obj):
        return obj.participants.count()


class CohortCreateSerializer(serializers.ModelSerializer):
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
