from datetime import date
from itertools import chain

from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Prefetch
from django.utils.text import slugify

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from rest_framework import filters, mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ModelViewSet, ReadOnlyModelViewSet


from chat.filters import ConversationFilter
from utils.timezone_mixin import TimezoneMixin
from chat.models.chat_models import Chat, ChatMedia
from chat.managers import export_zip_response
from chat.models.conversation_models import ConversationModel
from chat.models.export_job_model import ExportJob
from chat.models.guardrail_models import GuardrailRule
from chat.tasks import export_conversations_to_gcs
from chat.serializers import (
    ChatCreateSerializer,
    ChatSerializer,
    ConversationCreateSerializer,
    ConversationDetailSerializer,
    ConversationListSerializer,
    ExportJobSerializer,
    GuardrailRuleReadSerializer,
    GuardrailRuleWriteSerializer,
)
from utils.permissions import IsAdminOrResearcher



# Conversations fetched per batch while exporting; each batch prefetches all of
# its chats and media, so keep this small enough to bound memory on long chats.
EXPORT_CHUNK_SIZE = 20


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


class ChatViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_action_classes = {
        'list': ChatSerializer,
        'retrieve': ChatSerializer,
    }

    def get_queryset(self):
        return (
            Chat.objects.filter(conversation__user=self.request.user)
            .select_related('conversation')
            .prefetch_related('media')
            .order_by('-created_at')
        )

    def get_serializer_class(self):
        return self.serializer_action_classes.get(self.action, ChatCreateSerializer)

    @swagger_auto_schema(
        method='get',
        responses={
            200: openapi.Response(
                description='Guardrail ids to activate on LiteLLM for the requesting participant',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'guardrails': openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=openapi.Schema(type=openapi.TYPE_STRING),
                        ),
                    },
                ),
            )
        },
    )
    @action(detail=False, methods=['get'])
    def guardrails(self, request):
        dob = getattr(getattr(request.user, 'participant_profile', None), 'date_of_birth', None)
        if not dob:
            return Response({'guardrails': []})

        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        rule_guardrails = GuardrailRule.objects.filter(
            min_age__lte=age, max_age__gte=age
        ).values_list('guardrails', flat=True)

        guardrail_ids = list(dict.fromkeys(chain.from_iterable(gr or [] for gr in rule_guardrails)))

        return Response({'guardrails': guardrail_ids})


class GuardrailRuleViewSet(ModelViewSet):
    permission_classes = [IsAdminOrResearcher]
    queryset = GuardrailRule.objects.all()
    serializer_action_classes = {
        'list': GuardrailRuleReadSerializer,
        'retrieve': GuardrailRuleReadSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_action_classes.get(self.action, GuardrailRuleWriteSerializer)


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
        return ConversationModel.objects.select_related('user', 'user__participant_profile').order_by('-created_at').annotate(
            number_of_turns=Count('chats')
        )

    def _export_conversations(self, queryset):
        return queryset.prefetch_related(
            Prefetch(
                'chats',
                queryset=Chat.objects.only(
                    'id', 'conversation', 'prompt', 'response', 'metadata', 'created_at'
                ).order_by('created_at'),
            ),
            Prefetch('chats__media', queryset=ChatMedia.objects.only('id', 'chat', 'url')),
        ).iterator(chunk_size=EXPORT_CHUNK_SIZE)

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
                description='Zip archive with a conversations CSV and a turns CSV for the conversation',
                schema=openapi.Schema(type=openapi.TYPE_FILE),
            )
        },
    )
    @action(detail=True, methods=['get'], url_path='export')
    def export(self, request, pk=None):
        instance = self.get_object()
        conversations = self._export_conversations(self.get_queryset().filter(pk=instance.pk))
        filename = f'conversation-{instance.conversation_id}.zip'
        return export_zip_response(conversations, filename)

    @swagger_auto_schema(
        method='get',
        manual_parameters=_CONVERSATION_FILTER_PARAMS,
        responses={
            200: openapi.Response(
                description='Zip archive with a conversations CSV and a turns CSV per matching conversation',
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
            f"conversations-{'-'.join(active_filters)}.zip"
            if active_filters else
            'conversations-all.zip'
        )
        return export_zip_response(self._export_conversations(queryset), filename)


class ExportJobViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, GenericViewSet):
    queryset = ExportJob.objects.all()
    serializer_class = ExportJobSerializer
    permission_classes = []  # No authentication for now

    def perform_create(self, serializer):
        job = serializer.save()
        export_conversations_to_gcs.delay(job.id)

