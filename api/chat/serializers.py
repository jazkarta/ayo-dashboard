from datetime import date

from rest_framework import serializers

from django.contrib.auth import get_user_model
from django.db import transaction

from chat.models import ChatMedia, ConversationModel
from chat.models.chat_models import Chat
from cohort.serializers import CohortReadSerializer


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
    attachments = ChatMediaInputSerializer(many=True, required=False, default=list, write_only=True)

    class Meta:
        model = Chat
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'conversation')

    def validate(self, attrs):
        user_email = attrs.get('user_email')

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


class ChatSerializer(serializers.ModelSerializer):
    attachments = ChatMediaSerializer(many=True, read_only=True, source='media')

    class Meta:
        model = Chat
        fields = '__all__'

class ConversationUserSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()

    class Meta:
        model = User
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
    number_of_turns = serializers.SerializerMethodField()

    class Meta:
        model = ConversationModel
        fields = ['id', 'title', 'conversation_id', 'model_name', 'participant', 'cohort', 'created_at', 'number_of_turns', 'is_deleted']

    def get_created_at(self, obj):
        return obj.created_at.strftime('%B %d, %Y, %I:%M %p') if obj.created_at else None

    def get_number_of_turns(self, obj):
        if hasattr(obj, 'number_of_turns'):
            return obj.number_of_turns
        return obj.chats.exclude(response__startswith=Chat.ERROR_RESPONSE_PREFIX).count()

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
        return ConversationModel.objects.create(user=user, cohort=cohort, **validated_data)

    def to_representation(self, instance):
        return ConversationDetailSerializer(instance, context=self.context).data

