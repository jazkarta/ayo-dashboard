import logging

from utils.gcs_manager import GCSManager
from utils.keycloak_manager import KeycloakSync
from utils.librechat_manager import LibreChatSync

logger = logging.getLogger(__name__)

LIBRECHAT_MEDIA_PREFIXES = ("images", "uploads")


class UserPurgeManager:

    @classmethod
    def purge(cls, user):
        librechat = LibreChatSync()
        librechat_user_id = librechat.get_user_id(user.email)
        if librechat_user_id:
            for prefix in LIBRECHAT_MEDIA_PREFIXES:
                GCSManager.delete_prefix(f"{prefix}/{librechat_user_id}/")
            librechat.delete_user_data(librechat_user_id)

        if user.keycloak_id:
            KeycloakSync().delete_user(user.keycloak_id)
        else:
            logger.warning(f"Deleted user {user.username} had no keycloak_id – nothing to remove from Keycloak.")

        logger.info(f"User {user.username} purged from LibreChat, GCS and Keycloak.")
