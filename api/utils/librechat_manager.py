import logging
from bson import ObjectId
from pymongo import MongoClient
from django.conf import settings

logger = logging.getLogger(__name__)

# Owner field is a string in some collections and an ObjectId in others.
USER_OWNED_COLLECTIONS = {
    "messages": "user",
    "conversations": "user",
    "files": "user",
    "sharedlinks": "user",
    "conversationtags": "user",
    "toolcalls": "user",
    "transactions": "user",
    "balances": "user",
    "sessions": "user",
    "presets": "user",
    "actions": "user",
    "assistants": "user",
    "tokens": "userId",
    "keys": "userId",
    "pluginauths": "userId",
    "memoryentries": "userId",
}


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
        if self.db is None:
            try:
                self.client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=5000)
                # Parse the DB name from URI or default to 'LibreChat'
                db_name = self.mongo_uri.split("/")[-1] or "LibreChat"
                self.db = self.client[db_name]
            except Exception as e:
                logger.error(f"Failed to connect to LibreChat MongoDB: {e}")
                raise
        return self.db

    def _close(self):
        if self.client:
            self.client.close()
            self.client = None
            self.db = None

    def get_user_id(self, email):
        if not email:
            logger.warning("get_user_id called without an email – skipping.")
            return None

        try:
            user = self._get_db().users.find_one({"email": email}, {"_id": 1})
        finally:
            self._close()

        if not user:
            logger.warning(f"User {email} not found in LibreChat MongoDB.")
            return None
        return str(user["_id"])

    def delete_user_data(self, user_id):
        owner_ids = [user_id, ObjectId(user_id)]
        try:
            db = self._get_db()
            for collection, field in USER_OWNED_COLLECTIONS.items():
                result = db[collection].delete_many({field: {"$in": owner_ids}})
                if result.deleted_count:
                    logger.info(f"Deleted {result.deleted_count} {collection} for LibreChat user {user_id}.")
            db.users.delete_one({"_id": ObjectId(user_id)})
            logger.info(f"LibreChat user {user_id} and related data deleted.")
        finally:
            self._close()
