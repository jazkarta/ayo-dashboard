from django.urls import path

from .views import ChatCreateAPIView


urlpatterns = [
    path('', ChatCreateAPIView.as_view(), name='chat_create'),
]