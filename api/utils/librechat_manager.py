import logging
from pymongo import MongoClient
from django.conf import settings

logger = logging.getLogger(__name__)

class LibreChatSync:
    """
    Utility class to synchronize user data with LibreChat's MongoDB database.
    Specifically handles user deletion to ensure consistency across the platform.
    """

    def __init__(self):
        self.mongo_uri = settings.LIBRECHAT_MONGO_URI
        self.client = None
        self.db = None

    def _get_db(self):
        if not self.db:
            try:
                self.client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=5000)
                # Parse the DB name from URI or default to 'LibreChat'
                db_name = self.mongo_uri.split("/")[-1] or "LibreChat"
                self.db = self.client[db_name]
            except Exception as e:
                logger.error(f"Failed to connect to LibreChat MongoDB: {e}")
                raise
        return self.db

    def delete_user(self, email):
        """
        Delete a user from LibreChat by their email address.
        """
        if not email:
            logger.warning("delete_user called without an email – skipping.")
            return

        try:
            db = self._get_db()
            # Delete user from the 'users' collection
            result = db.users.delete_one({"email": email})
            
            if result.deleted_count > 0:
                logger.info(f"User {email} successfully deleted from LibreChat MongoDB.")
            else:
                logger.warning(f"User {email} not found in LibreChat MongoDB.")
            
            # Optionally delete other related data if necessary (e.g. conversations, messages)
            # For now, deleting the user is the primary requirement.
            
            return True
        except Exception as e:
            logger.error(f"Error deleting user {email} from LibreChat MongoDB: {e}")
            return False
        finally:
            if self.client:
                self.client.close()
                self.client = None
                self.db = None
