from rest_framework.generics import CreateAPIView

from chat.serializers import ChatCreateSerializer


class ChatCreateAPIView(CreateAPIView):
    serializer_class = ChatCreateSerializer