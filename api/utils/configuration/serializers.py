from django.db import transaction
from rest_framework import serializers

from .models import EmailConfiguration, GlobalConfiguration


class EmailConfigurationReadSerializer(serializers.ModelSerializer):
    has_password = serializers.BooleanField(read_only=True)

    class Meta:
        model = EmailConfiguration
        fields = [
            'id', 'name', 'email_host', 'email_port', 'email_use_tls', 'email_use_ssl',
            'email_host_user', 'has_password', 'default_from_email', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class EmailConfigurationCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = EmailConfiguration
        fields = [
            'id', 'name', 'email_host', 'email_port', 'email_use_tls', 'email_use_ssl',
            'email_host_user', 'password', 'default_from_email', 'is_active',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        if attrs.get('email_use_tls', True) and attrs.get('email_use_ssl', False):
            raise serializers.ValidationError('email_use_tls and email_use_ssl are mutually exclusive.')
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        raw_password = validated_data.pop('password')
        instance = EmailConfiguration(**validated_data)
        instance.password = raw_password
        instance.save()
        return instance

    def to_representation(self, instance):
        return EmailConfigurationReadSerializer(instance, context=self.context).data


class EmailConfigurationUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})

    class Meta:
        model = EmailConfiguration
        fields = [
            'name', 'email_host', 'email_port', 'email_use_tls', 'email_use_ssl',
            'email_host_user', 'password', 'default_from_email', 'is_active',
        ]

    def validate(self, attrs):
        use_tls = attrs.get('email_use_tls', self.instance.email_use_tls)
        use_ssl = attrs.get('email_use_ssl', self.instance.email_use_ssl)
        if use_tls and use_ssl:
            raise serializers.ValidationError('email_use_tls and email_use_ssl are mutually exclusive.')
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        raw_password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if raw_password is not None:
            instance.password = raw_password
        instance.save()
        return instance

    def to_representation(self, instance):
        return EmailConfigurationReadSerializer(instance, context=self.context).data


class EmailConfigurationTestSerializer(serializers.Serializer):
    recipient_email = serializers.EmailField(required=False)


class GlobalConfigurationReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalConfiguration
        fields = ['id', 'web_search', 'created_at', 'updated_at']
        read_only_fields = fields


class GlobalConfigurationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalConfiguration
        fields = ['web_search']

    @transaction.atomic
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def to_representation(self, instance):
        return GlobalConfigurationReadSerializer(instance, context=self.context).data
