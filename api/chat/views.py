from django.db.models import OuterRef, Subquery

from django_filters.rest_framework import DjangoFilterBackend

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from rest_framework import filters, mixins, status
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from chat.filters import ConversationFilter
from chat.managers import ConversationBulkExportManager, ConversationExportManager
from chat.models.chat_models import Chat
from chat.models.conversation_models import ConversationModel
from chat.serializers import (
    ChatCreateSerializer,
    ChatSerializer,
    ConversationCreateSerializer,
    ConversationDetailSerializer,
    ConversationListSerializer,
)


_CONVERSATION_FILTER_PARAMS = [
    openapi.Parameter('search', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Search by title, participant name, or email'),
    openapi.Parameter('model_name', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Filter by model name (case-insensitive)'),
    openapi.Parameter('participant_email', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Filter by participant email (case-insensitive)'),
    openapi.Parameter('date_from', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Include conversations on or after this date (YYYY-MM-DD)'),
    openapi.Parameter('date_to', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Include conversations on or before this date (YYYY-MM-DD)'),
]


class ChatCreateAPIView(CreateAPIView):
    serializer_class = ChatCreateSerializer


class ConversationViewSet(mixins.CreateModelMixin, ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ConversationFilter
    search_fields = ['title', 'user__email', 'user__first_name', 'user__last_name']
    serializer_action_classes = {
        'list': ConversationListSerializer,
        'create': ConversationCreateSerializer,
    }

    def get_queryset(self):
        if self.action in ('export', 'bulk_export'):
            return ConversationModel.objects.select_related('user')

        last_chat_subquery = Chat.objects.filter(
            conversation=OuterRef('pk')
        ).order_by('-created_at')

        return ConversationModel.objects.select_related(
            'user'
        ).prefetch_related(
            'chats'
        ).annotate(
            last_message=Subquery(last_chat_subquery.values('prompt')[:1])
        ).order_by(
            '-created_at'
        )

    def get_serializer_class(self):
        return self.serializer_action_classes.get(
            self.action,
            ConversationDetailSerializer
        )

    @swagger_auto_schema(manual_parameters=_CONVERSATION_FILTER_PARAMS)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

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
        chats = instance.chats.all().order_by('-created_at')

        page = self.paginate_queryset(chats)
        if page is not None:
            chat_serializer = ChatSerializer(page, many=True)
            response = self.get_paginated_response(chat_serializer.data)
            response.data.update(self.get_serializer(instance).data)
            return response

        serializer = ChatSerializer(chats, many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        method='get',
        responses={
            200: openapi.Response(
                description='CSV file with all messages in the conversation',
                schema=openapi.Schema(type=openapi.TYPE_FILE),
            )
        },
    )
    @action(detail=True, methods=['get'], url_path='export')
    def export(self, request, pk=None):
        instance = self.get_object()
        queryset = ConversationModel.objects.filter(pk=instance.pk).select_related('user')
        return ConversationExportManager.streaming_response(
            queryset,
            f'conversation_{instance.conversation_id}.csv',
        )

    @swagger_auto_schema(
        method='get',
        manual_parameters=_CONVERSATION_FILTER_PARAMS,
        responses={
            200: openapi.Response(
                description='CSV file with all messages from matching conversations',
                schema=openapi.Schema(type=openapi.TYPE_FILE),
            )
        },
    )
    @action(detail=False, methods=['get'], url_path='export')
    def bulk_export(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        return ConversationBulkExportManager.streaming_response(queryset, 'conversations_export.csv')
