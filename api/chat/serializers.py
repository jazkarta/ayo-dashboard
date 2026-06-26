from datetime import date
from zoneinfo import ZoneInfo

from rest_framework import serializers

from django.contrib.auth import get_user_model
from django.db import transaction

from chat.models import ChatMedia, ConversationModel, ExportJob, GuardrailRule
from chat.models.chat_models import Chat
from cohort.serializers import CohortReadSerializer
from users.serializers.user_serializers import UserSerializer


User = get_user_model()


class ChatMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMedia
        fields = ['id', 'filename', 'type', 'url']


class ChatMediaInputSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255)
    type = serializers.CharField(max_length=100)
    url = serializers.URLField(max_length=2048)


class ChatCreateSerializer(serializers.ModelSerializer):
    conversation_id = serializers.CharField(required=True, write_only=True)
    user_email = serializers.EmailField(required=True, write_only=True)
    model_name = serializers.CharField(required=True, write_only=True)
    attachments = ChatMediaInputSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = Chat
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'conversation')

    def validate(self, attrs):
        user_email = attrs.get('user_email')
        if not user_email:
            return attrs

        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            raise serializers.ValidationError(f"User with email '{user_email}' does not exist.")
        attrs['user'] = user

        try:
            attrs['conversation'] = ConversationModel.objects.get(
                conversation_id=attrs['conversation_id'], user=user
            )
        except ConversationModel.DoesNotExist:
            raise serializers.ValidationError(
                f"Conversation '{attrs['conversation_id']}' does not exist for this user."
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        attachments = validated_data.pop('attachments', [])
        conversation = validated_data.pop('conversation')
        validated_data.pop('conversation_id')
        validated_data.pop('model_name')
        validated_data.pop('user_email')
        validated_data.pop('user')

        chat = Chat.objects.create(conversation=conversation, **validated_data)

        if attachments:
            ChatMedia.objects.bulk_create([
                ChatMedia(chat=chat, filename=a['filename'], type=a['type'], url=a['url'])
                for a in attachments
            ])

        return chat

    @transaction.atomic
    def update(self, instance, validated_data):
        incoming = validated_data.get('metadata')
        if incoming is None:
            instance.metadata = None
        else:
            instance.metadata = {**(instance.metadata or {}), **incoming}
        instance.save(update_fields=['metadata', 'updated_at'])
        return instance


class ChatSerializer(serializers.ModelSerializer):
    attachments = ChatMediaSerializer(many=True, read_only=True, source='media')

    class Meta:
        model = Chat
        fields = '__all__'

class ConversationUserSerializer(UserSerializer):
    age = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = ['id', 'first_name', 'last_name', 'email', 'username', 'age']

    def get_age(self, obj):
        try:
            dob = obj.participant_profile.date_of_birth
        except Exception:
            return None
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return "Less than one year" if age == 0 else age


class ConversationListSerializer(serializers.ModelSerializer):
    participant = ConversationUserSerializer(read_only=True, source='user')
    cohort = CohortReadSerializer(read_only=True)
    created_at = serializers.SerializerMethodField()
    number_of_turns = serializers.IntegerField(read_only=True)

    class Meta:
        model = ConversationModel
        fields = ['id', 'title', 'conversation_id', 'model_name', 'participant', 'cohort', 'created_at', 'timezone', 'number_of_turns', 'is_deleted']

    def get_created_at(self, obj):
        if not obj.created_at:
            return None
        tz = ZoneInfo(obj.timezone or 'UTC')
        return obj.created_at.astimezone(tz).strftime('%B %d, %Y, %I:%M %p')

class ConversationDetailSerializer(serializers.ModelSerializer):
    participant = ConversationUserSerializer(read_only=True, source='user')

    class Meta:
        model = ConversationModel
        fields = ['id', 'title', 'conversation_id', 'model_name', 'participant', 'is_deleted']


class ConversationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationModel
        fields = ['title', 'conversation_id', 'model_name']

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        cohort = getattr(getattr(user, 'participant_profile', None), 'cohort', None)
        timezone = self.context.get('timezone', 'UTC')
        return ConversationModel.objects.create(user=user, cohort=cohort, timezone=timezone, **validated_data)

    def to_representation(self, instance):
        return ConversationDetailSerializer(instance, context=self.context).data


class ExportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportJob
        fields = [
            'id', 'status', 'cohort_id', 'date_from', 'date_to',
            'download_url', 'error_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'download_url', 'error_message', 'created_at', 'updated_at']


class GuardrailRuleReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuardrailRule
        fields = ['id', 'min_age', 'max_age', 'guardrails', 'created_at', 'updated_at']
        read_only_fields = fields


class GuardrailRuleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuardrailRule
        fields = ['min_age', 'max_age', 'guardrails']

    def validate_guardrails(self, value):
        if not isinstance(value, dict) or any(
            not isinstance(k, str) or not k.strip() or not isinstance(v, str) or not v.strip()
            for k, v in value.items()
        ):
            raise serializers.ValidationError(
                'guardrails must be an object mapping guardrail id to name, with non-empty string keys and values.'
            )
        return value

    def validate(self, attrs):
        min_age = attrs.get('min_age', getattr(self.instance, 'min_age', None))
        max_age = attrs.get('max_age', getattr(self.instance, 'max_age', None))
        if min_age is not None and max_age is not None and min_age > max_age:
            raise serializers.ValidationError('min_age must be less than or equal to max_age.')
        return attrs

    def to_representation(self, instance):
        return GuardrailRuleReadSerializer(instance, context=self.context).data


