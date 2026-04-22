from rest_framework import permissions
from users.models.user import UserRole


class IsAdmin(permissions.BasePermission):
    """
    Allows access only to admin users (is_staff=True).
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


class IsAdminOrResearcher(permissions.BasePermission):
    """
    Allows access only to admin users (is_staff=True) or users with the
    RESEARCHER role.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_staff
                or request.user.role == UserRole.RESEARCHER
            )
        )
