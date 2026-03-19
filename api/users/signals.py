import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from utils.keycloak_manager import KeycloakSync

logger = logging.getLogger(__name__)

User = get_user_model()

@receiver(post_save, sender=User)
def sync_user_to_keycloak(sender, instance, created, **kwargs):
    if created and getattr(instance, '_created_via_admin', False):
        logger.info(f"New user created in Django admin: {instance.username}. Syncing to Keycloak...")
        try:
            sync = KeycloakSync()
            keycloak_id = sync.create_user(
                username=instance.username,
                email=instance.email,
                first_name=instance.first_name,
                last_name=instance.last_name,
                role=instance.role
            )
            if keycloak_id:
                instance.keycloak_id = keycloak_id
                instance.save(update_fields=['keycloak_id'])
                logger.info(f"Successfully synced user {instance.username} to Keycloak with ID {keycloak_id}.")
        except Exception as e:
            logger.error(f"Failed to sync user {instance.username} to Keycloak: {str(e)}")
