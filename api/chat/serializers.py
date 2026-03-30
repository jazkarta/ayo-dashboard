from rest_framework import serializers

from django.contrib.auth import get_user_model
from django.db import transaction

from chat.models import Chat, ConversationModel
from participant.serializers import ParticipantProfileSerializer

User = get_user_model()


class ChatCreateSerializer(serializers.ModelSerializer):
    conversation_id = serializers.CharField(required=True, write_only=True)
    user_email = serializers.EmailField(required=True, write_only=True)
    model_name = serializers.CharField(required=True, write_only=True)

    class Meta:
        model = Chat
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'conversation')

    def get_last_conversation_for_user(self, user) -> ConversationModel | None:
        last_new_session = ConversationModel.objects.filter(
            conversation_id='new-session', user=user
        )

        if last_new_session.exists():
            return last_new_session.order_by('-created_at').last()
        else:
            return None


    def validate(self, attrs):
        conversation_id = attrs.get('conversation_id')
        user_email = attrs.get('user_email')
        prompt = attrs.get('prompt')

        try:
            user = User.objects.get(email=user_email)
            attrs['user'] = user
        except User.DoesNotExist:
            raise serializers.ValidationError(f"User with email '{user_email}' does not exist.")

        title_generation_prompt = "Provide a concise, 5-word-or-less title for the conversation, using title case conventions. Only return the title itself."

        if conversation_id != 'new-session':
            try:
                conversation = ConversationModel.objects.get(conversation_id=conversation_id, user=user)
            except ConversationModel.DoesNotExist:
                conversation = self.get_last_conversation_for_user(user)
                if not conversation:
                    raise serializers.ValidationError(f"Conversation with user '{user_email}' does not exist.")
            attrs['conversation'] = conversation
        else:
            if title_generation_prompt in prompt:
                conversation = self.get_last_conversation_for_user(user)
                if conversation:
                    conversation.title = attrs['response']
                    attrs['conversation'] = conversation
                    attrs["custom_type"] = "title_generation"
                    conversation.save()
                else:
                    raise serializers.ValidationError(f"No existing conversation found for user '{user_email}' to generate a title from.")

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        conversation = validated_data.pop('conversation', None)
        conversation_id = validated_data.pop('conversation_id', None)
        model_name = validated_data.pop('model_name', None)
        _ = validated_data.pop('user_email', None)
        user = validated_data.pop('user', None)
        custom_type = validated_data.get('custom_type', None)

        if custom_type == 'title_generation':
            return conversation.chats.last()

        if not conversation:
            conversation = ConversationModel.objects.create(
                conversation_id='new-session',
                user=user,
                model_name=model_name
            )
        else:
            conversation.conversation_id = conversation_id
            conversation.save()

        chat = Chat.objects.create(conversation=conversation, **validated_data)
        return chat


class ChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chat
        fields = '__all__'

class ConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.CharField(read_only=True)
    participant_information = serializers.SerializerMethodField()

    class Meta:
        model = ConversationModel
        fields = ['id', 'title', 'conversation_id', 'model_name', 'last_message', 'participant_information']

    def get_participant_information(self, obj):
        participant = getattr(obj.user, 'prefetched_participant', None)
        if participant:
            return ParticipantProfileSerializer(participant).data
        return None

class ConversationDetailSerializer(serializers.ModelSerializer):
    chats = ChatSerializer(many=True, read_only=True)
    participant_information = serializers.SerializerMethodField()

    class Meta:
        model = ConversationModel
        fields = ['id', 'title', 'conversation_id', 'model_name', 'chats', 'participant_information']

    def get_participant_information(self, obj):
        participant = getattr(obj.user, 'prefetched_participant', None)
        if participant:
            return ParticipantProfileSerializer(participant).data
        return None

