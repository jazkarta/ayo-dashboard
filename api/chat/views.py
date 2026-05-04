import csv
from collections import defaultdict

from django.db.models import OuterRef, Subquery
from django.http import StreamingHttpResponse

from django_filters.rest_framework import DjangoFilterBackend

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from rest_framework import filters, mixins, status
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from chat.models.chat_models import Chat, ChatMedia
from chat.models.conversation_models import ConversationModel
from chat.serializers import (
    ChatCreateSerializer,
    ChatSerializer,
    ConversationCreateSerializer,
    ConversationDetailSerializer,
    ConversationListSerializer,
)


class Echo:
    def write(self, value):
        return value


class ChatCreateAPIView(CreateAPIView):
    serializer_class = ChatCreateSerializer


class ConversationViewSet(mixins.CreateModelMixin, ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['title', 'user__email', 'user__first_name', 'user__last_name']
    serializer_action_classes = {
        'list': ConversationListSerializer,
        'create': ConversationCreateSerializer,
    }

    def get_queryset(self):
        if self.action == 'export':
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
        participant = instance.user
        participant_name = (
            f"{participant.first_name} {participant.last_name}".strip()
            or participant.username
        )

        media_map = defaultdict(list)
        for item in ChatMedia.objects.filter(
            chat__conversation=instance
        ).values('chat_id', 'url'):
            media_map[item['chat_id']].append(item['url'])

        chats = instance.chats.only(
            'prompt', 'response', 'created_at'
        ).order_by('created_at').iterator()

        def rows():
            yield [
                'conversation_title', 'conversation_id', 'model_name',
                'participant_name', 'message_date',
                'prompt', 'response', 'attachment_urls',
            ]
            for chat in chats:
                yield [
                    instance.title or '',
                    instance.conversation_id,
                    instance.model_name or '',
                    participant_name,
                    participant.email,
                    chat.created_at.isoformat(),
                    chat.prompt,
                    chat.response,
                    '|'.join(media_map.get(chat.id, [])),
                ]

        writer = csv.writer(Echo())
        response = StreamingHttpResponse(
            (writer.writerow(row) for row in rows()),
            content_type='text/csv',
        )
        response['Content-Disposition'] = (
            f'attachment; filename="conversation_{instance.conversation_id}.csv"'
        )
        return response