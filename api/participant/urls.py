from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ParticipantViewSet, InvitationViewSet

router = DefaultRouter()
router.register(r'invitations', InvitationViewSet, basename='invitation')
router.register(r'', ParticipantViewSet, basename='participant')

urlpatterns = [
    path('', include(router.urls)),
]
