from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmailConfigurationViewSet, GlobalConfigurationViewSet

router = DefaultRouter()
router.register(r'email-configurations', EmailConfigurationViewSet, basename='emailconfiguration')
router.register(r'global-configurations', GlobalConfigurationViewSet, basename='globalconfiguration')

urlpatterns = [
    path('', include(router.urls)),
]
