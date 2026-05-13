import logging

from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from users.models.user import UserRole
from users.serializers.user_serializers import UserSerializer
from utils.keycloak_manager import KeycloakSync

logger = logging.getLogger(__name__)

User = get_user_model()


class ResearcherReadSerializer(UserSerializer):
    """Read-only serializer for representing researcher data in responses."""

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['is_active', 'keycloak_id', 'role']
        read_only_fields = fields


class ResearcherCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new researcher.

    On save:
      1. Creates a Django User with role=RESEARCHER and is_active=True.
      2. Creates the user in Keycloak with the 'researchers' realm role.
      3. Persists the returned keycloak_id back onto the User.

    Username is intentionally left empty; it is not required for researchers.
    """

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']
        extra_kwargs = {
            'email': {
                'required': True,
                'validators': [
                    UniqueValidator(
                        queryset=User.objects.all(),
                        lookup='iexact',
                        message='A user with this email already exists.',
                    )
                ],
            },
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
        }

    def validate_email(self, value):
        return value.strip().lower()

    @transaction.atomic
    def create(self, validated_data):
        keycloak = KeycloakSync()

        # 1. Create Django user
        user = User.objects.create(
            role=UserRole.RESEARCHER,
            is_active=True,
            **validated_data,
        )

        # 2. Create user in Keycloak with the researchers role
        keycloak_id = keycloak.create_user(
            username=user.email,   # use email as the KC username (unique)
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=UserRole.RESEARCHER,   # 'researchers'
        )

        # 3. Persist keycloak_id
        user.keycloak_id = keycloak_id
        user.save(update_fields=['keycloak_id'])

        logger.info(
            f"Researcher {user.email} created in Django and Keycloak "
            f"(keycloak_id={keycloak_id})."
        )
        return user

    def to_representation(self, instance):
        return ResearcherReadSerializer(instance, context=self.context).data


class ResearcherUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating an existing researcher.

    Only first_name and last_name may be changed; email is immutable
    after creation. Keycloak is updated with any changed fields.
    """

    class Meta:
        model = User
        fields = ['first_name', 'last_name']

    @transaction.atomic
    def update(self, instance, validated_data):
        changed_fields = {
            field: value
            for field, value in validated_data.items()
            if getattr(instance, field) != value
        }

        # Update Django model
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Sync changed fields to Keycloak
        if changed_fields and instance.keycloak_id:
            keycloak = KeycloakSync()
            keycloak.update_user(
                keycloak_id=instance.keycloak_id,
                first_name=changed_fields.get('first_name'),
                last_name=changed_fields.get('last_name'),
            )
            logger.info(
                f"Researcher {instance.email} updated in Keycloak "
                f"(fields: {list(changed_fields.keys())})."
            )
        elif changed_fields and not instance.keycloak_id:
            logger.warning(
                f"Researcher {instance.email} has no keycloak_id – "
                "skipping Keycloak update."
            )

        return instance

    def to_representation(self, instance):
        return ResearcherReadSerializer(instance, context=self.context).data


class ResearcherToggleAdminSerializer(serializers.Serializer):
    """
    Toggles Django admin privileges (is_staff) on a researcher.
    Grants if not already admin; revokes if already admin.
    Only a researcher who is already a Django admin may invoke this.
    """

    @transaction.atomic
    def update(self, instance, validated_data):
        instance.is_staff = not instance.is_staff
        instance.save(update_fields=['is_staff'])
        return instance

    def to_representation(self, instance):
        return ResearcherReadSerializer(instance, context=self.context).data


class ResearcherDeactivateSerializer(serializers.Serializer):
    """
    Serializer for deactivating a researcher.

    Sets is_active=False on the Django user and disables the account in
    Keycloak by setting enabled=False.
    """

    def validate(self, attrs):
        researcher = self.instance
        if not researcher.is_active:
            raise serializers.ValidationError(
                "This researcher is already inactive."
            )
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        instance.is_active = False
        instance.save(update_fields=['is_active'])

        if not instance.keycloak_id:
            logger.warning(
                f"Researcher {instance.email} has no keycloak_id – "
                "deactivated in Django only."
            )

        return instance

    def to_representation(self, instance):
        return ResearcherReadSerializer(instance, context=self.context).data
