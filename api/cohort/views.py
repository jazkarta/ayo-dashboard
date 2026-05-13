import logging

from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend

from utils.permissions import IsResearcher
from .models import Cohort
from .serializers import CohortReadSerializer, CohortDetailSerializer, CohortCreateSerializer, CohortUpdateSerializer

logger = logging.getLogger(__name__)


class CohortViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResearcher]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        qs = Cohort.objects.filter(created_by=self.request.user).order_by('-created_at')
        if self.action == 'retrieve':
            return qs.prefetch_related('participants__user')
        return qs.prefetch_related('participants')

    def get_serializer_class(self):
        if self.action == 'create':
            return CohortCreateSerializer
        if self.action in ('update', 'partial_update'):
            return CohortUpdateSerializer
        if self.action == 'retrieve':
            return CohortDetailSerializer
        return CohortReadSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
