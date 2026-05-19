from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ChatCreateAPIView, ConversationViewSet, ExportJobViewSet

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'export-jobs', ExportJobViewSet, basename='export-job')


urlpatterns = [
    path('', ChatCreateAPIView.as_view(), name='chat_create'),
] + router.urls