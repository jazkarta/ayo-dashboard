from rest_framework import permissions
from users.models.user import UserRole

class IsResearcher(permissions.BasePermission):
    """
    Allows access only to users with the RESEARCHER role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.RESEARCHER
        )
