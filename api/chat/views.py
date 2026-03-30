from rest_framework.generics import CreateAPIView

from chat.serializers import ChatCreateSerializer, ConversationListSerializer, ConversationDetailSerializer
from rest_framework.viewsets import ReadOnlyModelViewSet
from chat.models.chat_models import Chat
from chat.models.conversation_models import ConversationModel
from django.db.models import OuterRef, Subquery, Prefetch
from rest_framework.permissions import IsAuthenticated
from participant.models.participant_profile_models import ParticipantProfile


class ChatCreateAPIView(CreateAPIView):
    serializer_class = ChatCreateSerializer


class ConversationViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_action_classes = {
        'list': ConversationListSerializer,
        'retrieve': ConversationDetailSerializer,
    }

    def get_queryset(self):
        user = self.request.user

        participants_prefetch = Prefetch(
            'user__participant_profile',
            # queryset=ParticipantProfile.objects.filter(user=user),
            queryset=ParticipantProfile.objects.all(),
            to_attr='prefetched_participant'
        )

        last_chat_subquery = Chat.objects.filter(
            conversation=OuterRef('pk')
        ).order_by('-created_at')

        queryset = ConversationModel.objects.filter().annotate(
            last_message=Subquery(last_chat_subquery.values('prompt')[:1])
        ).select_related('user').prefetch_related(participants_prefetch)

        if self.action == 'retrieve':
            queryset = queryset.prefetch_related('chats')

        return queryset

    def get_serializer_class(self):
        return self.serializer_action_classes.get(
            self.action,
            ConversationDetailSerializer
        )