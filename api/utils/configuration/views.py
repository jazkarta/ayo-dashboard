from django.db import transaction
from drf_yasg import openapi
from drf_yasg.utils import no_body, swagger_auto_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from utils.email_manager import EmailManager
from utils.permissions import IsAdmin
from .models import EmailConfiguration, GlobalConfiguration
from .serializers import (
    EmailConfigurationCreateSerializer,
    EmailConfigurationReadSerializer,
    EmailConfigurationTestSerializer,
    EmailConfigurationUpdateSerializer,
    GlobalConfigurationReadSerializer,
    GlobalConfigurationUpdateSerializer,
)


class EmailConfigurationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return EmailConfiguration.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return EmailConfigurationCreateSerializer
        if self.action in ('update', 'partial_update'):
            return EmailConfigurationUpdateSerializer
        if self.action == 'send_test_email':
            return EmailConfigurationTestSerializer
        return EmailConfigurationReadSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        instance = serializer.save(updated_by=self.request.user)
        self._deactivate_others(instance)

    @transaction.atomic
    def perform_update(self, serializer):
        instance = serializer.save(updated_by=self.request.user)
        self._deactivate_others(instance)

    def _deactivate_others(self, instance):
        if instance.is_active:
            EmailConfiguration.objects.exclude(pk=instance.pk).update(is_active=False)

    @swagger_auto_schema(request_body=no_body)
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        instance = self.get_object()
        with transaction.atomic():
            EmailConfiguration.objects.exclude(pk=instance.pk).update(is_active=False)
            instance.is_active = True
            instance.updated_by = request.user
            instance.save(update_fields=['is_active', 'updated_by', 'updated_at'])
        serializer = EmailConfigurationReadSerializer(instance, context=self.get_serializer_context())
        return Response(serializer.data)

    @swagger_auto_schema(request_body=EmailConfigurationTestSerializer)
    @action(detail=True, methods=['post'], url_path='send-test-email')
    def send_test_email(self, request, pk=None):
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recipient = serializer.validated_data.get('recipient_email') or request.user.email
        sent = EmailManager().send_test_email(recipient, config=instance)
        if sent:
            return Response({'detail': f'Test email sent to {recipient}.'})
        return Response(
            {'detail': 'Failed to send test email. Verify the SMTP configuration.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )


class GlobalConfigurationViewSet(mixins.UpdateModelMixin, GenericViewSet):
    queryset = GlobalConfiguration.objects.all()

    def get_serializer_class(self):
        if self.action in ('update', 'partial_update'):
            return GlobalConfigurationUpdateSerializer
        return GlobalConfigurationReadSerializer

    def get_permissions(self):
        if self.action in ('update', 'partial_update'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @swagger_auto_schema(
        responses={
            200: openapi.Response(
                description='Global configuration applied across services',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'web_search': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    },
                ),
            )
        },
    )
    def list(self, request):
        instance = GlobalConfiguration.load()
        serializer = GlobalConfigurationReadSerializer(instance, context=self.get_serializer_context())
        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
