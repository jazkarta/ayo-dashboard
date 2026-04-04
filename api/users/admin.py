import secrets
import string
import logging

from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.utils.translation import gettext_lazy as _

from utils.keycloak_manager import KeycloakSync
from .models import User

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Forms
# ---------------------------------------------------------------------------

class UserCreationForm(forms.ModelForm):
    """
    Form shown when an admin creates a brand-new user.

    A random secure password is generated automatically so the admin only
    needs to supply the identity fields.  The user can later reset their
    password via the standard Django mechanism.
    """

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "username", "role")

    def save(self, commit=True):
        user = super().save(commit=False)
        # Tag the instance so the signal knows it came from the admin creation form
        user._created_via_admin = True
        # Generate a strong random password the user can reset later
        alphabet = string.ascii_letters + string.digits + string.punctuation
        random_password = "".join(secrets.choice(alphabet) for _ in range(20))
        user.set_password(random_password)
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    """
    Form shown when editing an existing user in the admin.

    The password field displays the hashed value (read-only) with a link to
    the change-password view, matching Django's built-in behaviour.
    """

    password = ReadOnlyPasswordHashField(
        label=_("Password"),
        help_text=_(
            "Raw passwords are not stored, so there is no way to see this "
            "user's password, but you can change the password using "
            '<a href="../password/">this form</a>.'
        ),
    )

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "username",
            "role",
            "password",
            "is_active",
            "is_staff",
            "is_superuser",
        )


# ---------------------------------------------------------------------------
# ModelAdmin
# ---------------------------------------------------------------------------

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form = UserCreationForm
    form = UserChangeForm
    model = User

    # ------------------------------------------------------------------
    # List view
    # ------------------------------------------------------------------
    list_display = ("email", "first_name", "last_name", "username", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff", "is_superuser")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("email",)
    
    def get_readonly_fields(self, request, obj=None):
        """
        `username` is editable when creating a new user (obj is None)
        but becomes read-only on the change form to prevent accidental edits.
        """
        if obj:  # editing an existing user
            return ('username',)
        return ()

    # ------------------------------------------------------------------
    # Detail / change view fieldsets
    # ------------------------------------------------------------------
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "username")}),
        (_("Role"), {"fields": ("role",)}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    # ------------------------------------------------------------------
    # Add (create) view fieldsets
    # ------------------------------------------------------------------
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "username", "role"),
                "description": (
                    "A secure random password will be generated automatically. "
                    "The user can reset it via the password-reset link."
                ),
            },
        ),
    )

    # ------------------------------------------------------------------
    # Post-save hook – show the generated password once in the admin UI
    # ------------------------------------------------------------------
    def save_model(self, request, obj, form, change):
        """
        For new users, save normally (password was set in UserCreationForm.save).
        We display a one-time info message so the admin can share the credentials.
        Updates are handled by the post_save signal in signals.py.
        """
        is_new = obj.pk is None
        super().save_model(request, obj, form, change)
        if is_new:
            messages.info(
                request,
                _(
                    f'User "{obj.email}" created successfully. '
                    "A random password has been set — use the "
                    '"Change password" link on the user detail page to set a known password, '
                    "or ask the user to use the password-reset flow."
                ),
            )

    # ------------------------------------------------------------------
    # Delete hooks – ensure Keycloak is kept in sync
    # ------------------------------------------------------------------

    def delete_model(self, request, obj):
        """
        Called when a single user is deleted via the change-form 'Delete' button.
        The post_delete signal fires automatically here, so we just call super().
        Defined explicitly for clarity.
        """
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        """
        Called when using the 'Delete selected users' bulk action in the
        change-list.  Django's bulk QuerySet.delete() bypasses model signals,
        so we sync each user to Keycloak manually before deleting.
        """
        sync = KeycloakSync()
        for user in queryset:
            if user.keycloak_id:
                try:
                    sync.delete_user(user.keycloak_id)
                except Exception as e:
                    logger.error(
                        f"Failed to delete Keycloak user {user.keycloak_id} "
                        f"(Django user: {user.username}): {e}"
                    )
                    messages.warning(
                        request,
                        f'Could not remove user "{user.username}" from Keycloak: {e}',
                    )
        super().delete_queryset(request, queryset)
