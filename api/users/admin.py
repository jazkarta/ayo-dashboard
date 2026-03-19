import secrets
import string

from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.utils.translation import gettext_lazy as _

from .models import User


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
        fields = ("username", "first_name", "last_name", "email", "role")

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
            "username",
            "first_name",
            "last_name",
            "email",
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
    list_display = ("username", "first_name", "last_name", "email", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff", "is_superuser")
    search_fields = ("username", "first_name", "last_name", "email")
    ordering = ("username",)

    # ------------------------------------------------------------------
    # Detail / change view fieldsets
    # ------------------------------------------------------------------
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "email")}),
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
                "fields": ("username", "first_name", "last_name", "email", "role"),
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
        """
        is_new = obj.pk is None
        super().save_model(request, obj, form, change)
        if is_new:
            messages.info(
                request,
                _(
                    f'User "{obj.username}" created successfully. '
                    "A random password has been set — use the "
                    '"Change password" link on the user detail page to set a known password, '
                    "or ask the user to use the password-reset flow."
                ),
            )
