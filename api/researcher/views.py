import logging

from django.contrib.auth import get_user_model
from rest_framework import viewsets, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from users.models.user import UserRole
from .permissions import IsAdmin, IsAdminOrResearcher, IsResearcherAdmin
from .serializers import (
    ResearcherCreateSerializer,
    ResearcherUpdateSerializer,
    ResearcherDeactivateSerializer,
    ResearcherToggleAdminSerializer,
    ResearcherReadSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class ResearcherViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing researcher accounts.

    Accessible by admin users (is_staff=True) and users with the RESEARCHER role.

    list        GET  /api/researchers/
    create      POST /api/researchers/
    retrieve    GET  /api/researchers/{id}/
    update      PUT  /api/researchers/{id}/
    partial_update PATCH /api/researchers/{id}/
    destroy     DELETE /api/researchers/{id}/
    deactivate    POST /api/researchers/{id}/deactivate/
    toggle_admin  POST /api/researchers/{id}/toggle-admin/
    """

    queryset = User.objects.filter(role=UserRole.RESEARCHER).order_by('-date_joined')
    permission_classes = [IsAdminOrResearcher]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['first_name', 'last_name', 'email']
    ordering_fields = ['first_name', 'last_name', 'email', 'date_joined']

    def get_permissions(self):
        if self.action in ('create', 'destroy', 'deactivate'):
            return [IsAdmin()]
        if self.action == 'toggle_admin':
            return [IsResearcherAdmin()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == 'create':
            return ResearcherCreateSerializer
        if self.action in ('update', 'partial_update'):
            return ResearcherUpdateSerializer
        if self.action == 'deactivate':
            return ResearcherDeactivateSerializer
        if self.action == 'toggle_admin':
            return ResearcherToggleAdminSerializer
        return ResearcherReadSerializer

    @swagger_auto_schema(
        operation_description="Toggle Django admin privileges on a researcher. Grants admin if not already assigned; revokes if already assigned. Only researchers who are also Django admins can perform this action.",
        responses={
            200: openapi.Response('Researcher admin status toggled', ResearcherReadSerializer),
        }
    )
    @action(detail=True, methods=['post'], url_path='toggle-admin')
    def toggle_admin(self, request, pk=None):
        researcher = self.get_object()
        serializer = ResearcherToggleAdminSerializer(
            instance=researcher,
            data={},
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        researcher = serializer.save()
        logger.info(f"Researcher {researcher.email} admin status toggled by {request.user.email}.")
        return Response(serializer.to_representation(researcher), status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_description="Deactivate a researcher (sets is_active=False in Django and Keycloak).",
        responses={
            200: openapi.Response('Researcher deactivated', ResearcherReadSerializer),
            400: 'Researcher is already inactive.',
        }
    )
    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        """
        Soft-deactivate a researcher.

        Sets is_active=False on the Django user and disables the account in
        Keycloak (enabled=False).  Returns 400 if the researcher is already
        inactive.
        """
        researcher = self.get_object()
        serializer = ResearcherDeactivateSerializer(
            instance=researcher,
            data={},
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        researcher = serializer.save()
        logger.info(f"Researcher {researcher.email} deactivated by {request.user.email}.")
        return Response(serializer.to_representation(researcher), status=status.HTTP_200_OK)
