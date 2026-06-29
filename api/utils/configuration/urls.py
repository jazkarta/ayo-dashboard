from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmailConfigurationViewSet

router = DefaultRouter()
router.register(r'email-configurations', EmailConfigurationViewSet, basename='emailconfiguration')

urlpatterns = [
    path('', include(router.urls)),
]
