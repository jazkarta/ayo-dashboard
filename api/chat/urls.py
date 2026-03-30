from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ChatCreateAPIView, ConversationViewSet

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')


urlpatterns = [
    path('', ChatCreateAPIView.as_view(), name='chat_create'),
] + router.urls