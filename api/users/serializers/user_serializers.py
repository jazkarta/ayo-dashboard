from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    is_admin_researcher = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'full_name', 'username', 'email', 'first_name', 'last_name', 'is_admin_researcher']

    def get_full_name(self, obj):
        return obj.get_full_name()