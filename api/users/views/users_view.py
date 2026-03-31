from rest_framework import generics, permissions
from django.contrib.auth import get_user_model
from users.serializers.user_serializers import UserSerializer

User = get_user_model()

class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user