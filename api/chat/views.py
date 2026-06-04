from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.utils.text import slugify

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from rest_framework import filters, mixins, status
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ReadOnlyModelViewSet


from chat.filters import ConversationFilter
from utils.timezone_mixin import TimezoneMixin
from chat.models.chat_models import Chat
from chat.managers import ConversationBulkExportManager, ConversationExportManager
from chat.models.conversation_models import ConversationModel
from chat.models.export_job_model import ExportJob
from chat.tasks import export_conversations_to_gcs
from chat.serializers import (
    ChatCreateSerializer,
    ChatSerializer,
    ConversationCreateSerializer,
    ConversationDetailSerializer,
    ConversationListSerializer,
    ExportJobSerializer,
)



_CONVERSATION_FILTER_PARAMS = [
    openapi.Parameter('search', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Search by title, participant name, or email'),
    openapi.Parameter('participant_username', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Filter by participant username'),
    openapi.Parameter('date_from', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Include conversations on or after this date (YYYY-MM-DD)'),
    openapi.Parameter('date_to', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Include conversations on or before this date (YYYY-MM-DD)'),
    openapi.Parameter('turns_min', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, description='Include conversations with at least this many turns'),
    openapi.Parameter('turns_max', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, description='Include conversations with at most this many turns'),
    openapi.Parameter('participant_age', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, description='Filter by participant age in years (exact match)'),
    openapi.Parameter('cohort_id', openapi.IN_QUERY, type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, description='Filter by cohort UUID'),
]


class ChatCreateAPIView(CreateAPIView):
    serializer_class = ChatCreateSerializer


class ConversationViewSet(TimezoneMixin, mixins.CreateModelMixin, ReadOnlyModelViewSet):
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
            return ConversationModel.objects.select_related(
                'user', 'user__participant_profile'
            ).annotate(number_of_turns=Count('chats', filter=~Q(chats__response__startswith=Chat.ERROR_RESPONSE_PREFIX)))

        return ConversationModel.objects.select_related('user', 'user__participant_profile').order_by('-created_at').annotate(
            number_of_turns=Count('chats', filter=~Q(chats__response__startswith=Chat.ERROR_RESPONSE_PREFIX))
        )

    def get_serializer_class(self):
        return self.serializer_action_classes.get(
            self.action,
            ConversationDetailSerializer
        )

    @swagger_auto_schema(manual_parameters=_CONVERSATION_FILTER_PARAMS)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['patch'], url_path='mark-deleted')
    def mark_deleted(self, request):
        conversation_id = request.data.get('conversation_id')
        if not conversation_id:
            return Response({'error': 'conversation_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        updated = ConversationModel.objects.filter(
            conversation_id=conversation_id, user=request.user
        ).update(is_deleted=True)
        if not updated:
            return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

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
        chats = instance.chats.prefetch_related('media').order_by('created_at')

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
        queryset = ConversationModel.objects.filter(pk=instance.pk).select_related('user', 'user__participant_profile')
        filename = f'conversation-{instance.conversation_id}.csv'
        return ConversationExportManager.streaming_response(queryset, filename, self.get_request_timezone())

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
        if not queryset.exists():
            return Response({'detail': 'No conversations found for the given filters.'}, status=status.HTTP_404_NOT_FOUND)
        active_filters = [
            slugify(request.query_params[key])
            for key in ('participant_username', 'date_from', 'date_to')
            if request.query_params.get(key)
        ]
        filename = (
            f"conversations-{'-'.join(active_filters)}.csv"
            if active_filters else
            'conversations-all.csv'
        )
        return ConversationBulkExportManager.streaming_response(queryset, filename, self.get_request_timezone())


class ExportJobViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, GenericViewSet):
    queryset = ExportJob.objects.all()
    serializer_class = ExportJobSerializer
    permission_classes = []  # No authentication for now

    def perform_create(self, serializer):
        job = serializer.save()
        export_conversations_to_gcs.delay(job.id)

