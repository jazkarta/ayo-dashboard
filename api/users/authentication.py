import logging
from django.conf import settings
from rest_framework import authentication, exceptions
from keycloak import KeycloakOpenID
from keycloak.exceptions import KeycloakError
from users.models.user import User

logger = logging.getLogger(__name__)

class KeycloakAuthentication(authentication.BaseAuthentication):
    """
    Keycloak authentication class for Django REST Framework.
    Validates the Bearer token against Keycloak and attaches the user to the request.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.keycloak_openid = KeycloakOpenID(
            server_url=settings.KEYCLOAK_SERVER_URL,
            client_id=settings.KEYCLOAK_CLIENT_ID,
            realm_name=settings.KEYCLOAK_REALM,
        )

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]

        try:
            # Validate token with Keycloak userinfo endpoint
            # This ensures the token is active and valid (checks with Keycloak server)
            user_info = self.keycloak_openid.userinfo(token)
            
            if not user_info or 'sub' not in user_info:
                raise exceptions.AuthenticationFailed('Invalid or expired token')

            keycloak_id = user_info.get('sub')
            email = user_info.get('email')
            if not email:
                logger.warning(f"Keycloak user {keycloak_id} has no email")

            # Get or create user based on keycloak_id or email
            user = User.objects.filter(keycloak_id=keycloak_id, email=email).first()
            if user:
                return (user, token)
            else:
                return None

        except KeycloakError as e:
            logger.error(f"Keycloak authentication error: {str(e)}")
            raise exceptions.AuthenticationFailed(f"Authentication failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected authentication error: {str(e)}")
            if isinstance(e, exceptions.AuthenticationFailed):
                raise e
            raise exceptions.AuthenticationFailed("An error occurred during authentication")

    def authenticate_header(self, request):
        return 'Bearer'
