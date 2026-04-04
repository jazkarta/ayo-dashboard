import logging
from django.conf import settings
from keycloak import KeycloakAdmin
from keycloak.exceptions import KeycloakError

logger = logging.getLogger(__name__)


class KeycloakSync:

    def __init__(self):
        logger.info(f"Connecting to Keycloak at {settings.KEYCLOAK_SERVER_URL} (Realm: {settings.KEYCLOAK_REALM})")
        self.keycloak_admin = KeycloakAdmin(
            server_url=settings.KEYCLOAK_SERVER_URL,
            username=settings.KEYCLOAK_ADMIN_USERNAME,
            password=settings.KEYCLOAK_ADMIN_PASSWORD,
            realm_name=settings.KEYCLOAK_REALM,
            user_realm_name='master',  # Admin users are in the 'master' realm by default
            verify=False
        )

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create_user(self, username, email, first_name="", last_name="", role="participants"):
        """Create a new user in Keycloak and assign the given realm role."""
        try:
            new_user = self.keycloak_admin.create_user({
                "email": email,
                "username": username,
                "enabled": True,
                "firstName": first_name,
                "lastName": last_name,
                "emailVerified": True,
            }, exist_ok=False)

            logger.info(f"User {username} created in Keycloak with ID: {new_user}")
            self.assign_role_by_id(new_user, role)

            return new_user
        except KeycloakError as e:
            logger.error(f"Error creating user in Keycloak: {str(e)}")
            raise

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update_user(self, keycloak_id, username=None, email=None, first_name=None, last_name=None, role=None):
        """
        Update an existing Keycloak user identified by *keycloak_id*.

        Only the fields that are explicitly passed (not None) are sent to
        Keycloak. If *role* is provided the existing realm roles are replaced
        with the new one.
        """
        if not keycloak_id:
            logger.warning("update_user called without a keycloak_id – skipping.")
            return

        try:
            payload = {}
            if email is not None:
                payload["email"] = email
            if first_name is not None:
                payload["firstName"] = first_name
            if last_name is not None:
                payload["lastName"] = last_name

            if payload:
                self.keycloak_admin.update_user(user_id=keycloak_id, payload=payload)
                logger.info(f"Keycloak user {keycloak_id} updated with payload: {payload}")

            if role is not None:
                self._replace_realm_role(keycloak_id, role)

        except KeycloakError as e:
            logger.error(f"Error updating Keycloak user {keycloak_id}: {str(e)}")
            raise

    def _replace_realm_role(self, keycloak_id, new_role_name):
        """Remove all existing realm roles from a user and assign *new_role_name*."""
        try:
            # Fetch currently assigned realm roles (skip built-in ones)
            existing_roles = self.keycloak_admin.get_realm_roles_of_user(keycloak_id)
            roles_to_remove = [r for r in existing_roles if r["name"] not in ("offline_access", "uma_authorization", "default-roles-" + settings.KEYCLOAK_REALM.lower())]

            if roles_to_remove:
                self.keycloak_admin.delete_realm_roles_of_user(keycloak_id, roles_to_remove)
                logger.info(f"Removed roles {[r['name'] for r in roles_to_remove]} from Keycloak user {keycloak_id}")

            new_role = self.keycloak_admin.get_realm_role(new_role_name)
            self.keycloak_admin.assign_realm_roles(keycloak_id, [new_role])
            logger.info(f"Assigned role '{new_role_name}' to Keycloak user {keycloak_id}")
        except KeycloakError as e:
            logger.error(f"Error replacing realm role for Keycloak user {keycloak_id}: {str(e)}")
            raise

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    def delete_user(self, keycloak_id):
        """
        Delete a user from Keycloak by their *keycloak_id*.

        Safe to call even if the user no longer exists in Keycloak (logs a
        warning instead of raising).
        """
        if not keycloak_id:
            logger.warning("delete_user called without a keycloak_id – skipping.")
            return

        try:
            self.keycloak_admin.delete_user(keycloak_id)
            logger.info(f"Keycloak user {keycloak_id} deleted successfully.")
        except KeycloakError as e:
            # 404 means the user was already gone – treat as a soft warning
            if "404" in str(e):
                logger.warning(f"Keycloak user {keycloak_id} not found during deletion (already deleted?).")
            else:
                logger.error(f"Error deleting Keycloak user {keycloak_id}: {str(e)}")
                raise

    # ------------------------------------------------------------------
    # Role helpers
    # ------------------------------------------------------------------

    def assign_role(self, username, role_name):
        """Assign a realm role to a user looked up by *username*."""
        try:
            user_id = self.keycloak_admin.get_user_id(username)
            if not user_id:
                logger.error(f"User {username} not found in Keycloak")
                return
            self.assign_role_by_id(user_id, role_name)
        except KeycloakError as e:
            logger.error(f"Error assigning role to user in Keycloak: {str(e)}")
            raise

    def assign_role_by_id(self, keycloak_id, role_name):
        """Assign a realm role to a user identified by their Keycloak *keycloak_id*."""
        try:
            role = self.keycloak_admin.get_realm_role(role_name)
            self.keycloak_admin.assign_realm_roles(keycloak_id, [role])
            logger.info(f"Role '{role_name}' assigned to Keycloak user {keycloak_id}")
        except KeycloakError as e:
            logger.error(f"Error assigning role '{role_name}' to Keycloak user {keycloak_id}: {str(e)}")
            raise
