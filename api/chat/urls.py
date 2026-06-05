from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatViewSet, ConversationViewSet, ExportJobViewSet

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'export-jobs', ExportJobViewSet, basename='export-job')
router.register(r'', ChatViewSet, basename='chat')

urlpatterns = [
    path('', include(router.urls)),
]