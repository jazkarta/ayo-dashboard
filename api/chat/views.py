from rest_framework.generics import CreateAPIView
from rest_framework import mixins

from chat.serializers import ChatCreateSerializer, ConversationListSerializer, ConversationDetailSerializer, ChatSerializer, ConversationCreateSerializer
from rest_framework.viewsets import ReadOnlyModelViewSet
from chat.models.chat_models import Chat
from chat.models.conversation_models import ConversationModel
from django.db.models import OuterRef, Subquery
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response


class ChatCreateAPIView(CreateAPIView):
    serializer_class = ChatCreateSerializer


class ConversationViewSet(mixins.CreateModelMixin, ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_action_classes = {
        'list': ConversationListSerializer,
        'create': ConversationCreateSerializer,
    }

    def get_queryset(self):
        last_chat_subquery = Chat.objects.filter(
            conversation=OuterRef('pk')
        ).order_by('-created_at')

        queryset = ConversationModel.objects.select_related(
            'user'
        ).prefetch_related(
            'chats'
        ).annotate(
            last_message=Subquery(last_chat_subquery.values('prompt')[:1])
        ).order_by(
            '-created_at'
        )

        return queryset

    def get_serializer_class(self):
        return self.serializer_action_classes.get(
            self.action,
            ConversationDetailSerializer
        )

    @action(detail=False, methods=['patch'], url_path='update-title')
    def update_title(self, request):
        conversation_id = request.data.get('conversation_id')
        title = request.data.get('title')
        try:
            conversation = ConversationModel.objects.get(conversation_id=conversation_id, user=request.user)
            conversation.title = title
            conversation.save()
            return Response(ConversationDetailSerializer(conversation).data)
        except ConversationModel.DoesNotExist:
            return Response({'error': 'Conversation not found'}, status=404)

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        instance = self.get_object()
        chats = instance.chats.all().order_by(
            '-created_at'
        )

        page = self.paginate_queryset(chats)
        if page is not None:
            serializer = ChatSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ChatSerializer(chats, many=True)
        return Response(serializer.data)