import logging

from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend

from utils.permissions import IsResearcher
from .models import Cohort
from .serializers import CohortReadSerializer, CohortCreateSerializer, CohortUpdateSerializer

logger = logging.getLogger(__name__)


class CohortViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResearcher]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        return Cohort.objects.filter(
            created_by=self.request.user
        ).prefetch_related('participants').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return CohortCreateSerializer
        if self.action in ('update', 'partial_update'):
            return CohortUpdateSerializer
        return CohortReadSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
