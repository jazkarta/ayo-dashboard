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

    def create_user(self, username, email, first_name="", last_name="", role="participants"):
        try:
            # Create the user in Keycloak
            new_user = self.keycloak_admin.create_user({
                "email": email,
                "username": username,
                "enabled": True,
                "firstName": first_name,
                "lastName": last_name,
                "emailVerified": True,
            }, exist_ok=False)

            logger.info(f"User {username} created in Keycloak with ID: {new_user}")
            self.assign_role(username, role)

            return new_user
        except KeycloakError as e:
            logger.error(f"Error creating user in Keycloak: {str(e)}")
            raise

    def assign_role(self, username, role_name):
        try:
            # Get user ID by username
            user_id = self.keycloak_admin.get_user_id(username)
            if not user_id:
                logger.error(f"User {username} not found in Keycloak")
                return

            # Get realm role
            role = self.keycloak_admin.get_realm_role(role_name)

            # Assign role to user
            self.keycloak_admin.assign_realm_roles(user_id, [role])
            logger.info(f"Role {role_name} assigned to user {username} in Keycloak")
        except KeycloakError as e:
            logger.error(f"Error assigning role to user in Keycloak: {str(e)}")
            raise
