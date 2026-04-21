import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from utils.keycloak_manager import KeycloakSync
from utils.librechat_manager import LibreChatSync

logger = logging.getLogger(__name__)

User = get_user_model()

# Fields that, when changed, should be synced to Keycloak
KEYCLOAK_TRACKED_FIELDS = {"first_name", "last_name", "email", "username", "role", "is_active"}


# ---------------------------------------------------------------------------
# pre_save – snapshot the DB state so we can diff after save
# ---------------------------------------------------------------------------

@receiver(pre_save, sender=User)
def snapshot_user_before_save(sender, instance, **kwargs):
    """
    Store the current DB values of Keycloak-tracked fields on the instance
    so the post_save handler can tell what actually changed.
    """
    if not instance.pk:
        # Brand-new user – nothing to snapshot
        instance._keycloak_pre_save_snapshot = None
        return

    try:
        db_instance = User.objects.get(pk=instance.pk)
        instance._keycloak_pre_save_snapshot = {
            field: getattr(db_instance, field) for field in KEYCLOAK_TRACKED_FIELDS
        }
    except User.DoesNotExist:
        instance._keycloak_pre_save_snapshot = None


# ---------------------------------------------------------------------------
# post_save – create (admin flow) or update
# ---------------------------------------------------------------------------

@receiver(post_save, sender=User)
def sync_user_to_keycloak(sender, instance, created, **kwargs):
    # ---- CREATE (existing admin flow) ------------------------------------
    if created and getattr(instance, '_created_via_admin', False):
        logger.info(f"New user created via Django admin: {instance.username}. Syncing to Keycloak…")
        sync = KeycloakSync()
        keycloak_id = sync.create_user(
            username=instance.username,
            email=instance.email,
            first_name=instance.first_name,
            last_name=instance.last_name,
            role=instance.role,
        )
        if keycloak_id:
            instance.keycloak_id = keycloak_id
            instance.save(update_fields=['keycloak_id'])
            logger.info(f"Synced new user {instance.username} to Keycloak with ID {keycloak_id}.")
        return  # nothing more to do for a creation

    # ---- UPDATE ----------------------------------------------------------
    if not created:
        snapshot = getattr(instance, '_keycloak_pre_save_snapshot', None)
        if snapshot is None:
            return  # couldn't snapshot – skip to be safe

        # Determine which tracked fields actually changed
        changed = {
            field for field in KEYCLOAK_TRACKED_FIELDS
            if getattr(instance, field) != snapshot.get(field)
        }

        if not changed:
            return  # nothing relevant changed

        if not instance.keycloak_id:
            logger.warning(
                f"User {instance.username} has no keycloak_id – cannot sync update to Keycloak."
            )
            return

        logger.info(f"User {instance.username} changed fields {changed}. Syncing to Keycloak…")
        sync = KeycloakSync()
        sync.update_user(
            keycloak_id=instance.keycloak_id,
            username=instance.username if "username" in changed else None,
            email=instance.email if "email" in changed else None,
            first_name=instance.first_name if "first_name" in changed else None,
            last_name=instance.last_name if "last_name" in changed else None,
            role=instance.role if "role" in changed else None,
            enabled=instance.is_active if "is_active" in changed else None,
        )
        logger.info(f"Keycloak user {instance.keycloak_id} updated successfully.")


# ---------------------------------------------------------------------------
# post_delete – remove from Keycloak
# ---------------------------------------------------------------------------

@receiver(post_delete, sender=User)
def delete_user_from_keycloak(sender, instance, **kwargs):
    if not instance.keycloak_id:
        logger.warning(
            f"Deleted user {instance.username} had no keycloak_id – nothing to remove from Keycloak."
        )
        return

    logger.info(f"User {instance.username} deleted from Django. Syncing to Keycloak & LibreChat…")
    # 1. Sync deletion with Keycloak
    sync_kc = KeycloakSync()
    sync_kc.delete_user(instance.keycloak_id)
    logger.info(f"Keycloak user {instance.keycloak_id} deleted successfully.")
    
    # 2. Sync deletion with LibreChat
    sync_lc = LibreChatSync()
    sync_lc.delete_user(instance.email)
    logger.info(f"LibreChat user {instance.email} deleted successfully.")
