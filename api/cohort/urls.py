from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CohortViewSet

router = DefaultRouter()
router.register(r'', CohortViewSet, basename='cohort')

urlpatterns = [
    path('', include(router.urls)),
]
