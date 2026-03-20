from rest_framework import serializers

from django.contrib.auth import get_user_model
from django.db import transaction

from chat.models import Chat, ConversationModel

User = get_user_model()


class ChatCreateSerializer(serializers.ModelSerializer):
    conversation_id = serializers.CharField(required=True, write_only=True)
    user_email = serializers.EmailField(required=True, write_only=True)
    model_name = serializers.CharField(required=True, write_only=True)

    class Meta:
        model = Chat
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'conversation')


    def validate(self, attrs):
        conversation_id = attrs.get('conversation_id')
        user_email = attrs.get('user_email')

        try:
            user = User.objects.get(email=user_email)
            attrs['user'] = user
        except User.DoesNotExist:
            raise serializers.ValidationError(f"User with email '{user_email}' does not exist.")

        if conversation_id != 'new-session':
            try:
                conversation = ConversationModel.objects.get(conversation_id=conversation_id, user=user)
            except ConversationModel.DoesNotExist:
                last_new_session = ConversationModel.objects.filter(
                    conversation_id='new-session', user=user
                )

                if last_new_session.exists():
                    conversation = last_new_session.last()
                else:
                    raise serializers.ValidationError(f"Conversation with user '{user_email}' does not exist.")
            attrs['conversation'] = conversation

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        conversation = validated_data.pop('conversation', None)
        conversation_id = validated_data.pop('conversation_id', None)
        model_name = validated_data.pop('model_name', None)
        _ = validated_data.pop('user_email', None)
        user = validated_data.pop('user', None)

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