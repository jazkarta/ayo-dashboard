import base64
import hashlib

from cryptography.fernet import Fernet
from django.conf import settings


def _get_fernet() -> Fernet:
    key = getattr(settings, 'EMAIL_CONFIG_ENCRYPTION_KEY', None)
    if key:
        key = key.encode()
    else:
        # Derived from SECRET_KEY; rotating it without an explicit key invalidates stored secrets.
        key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
    return Fernet(key)


def encrypt_value(value: str) -> str:
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt_value(token: str) -> str:
    return _get_fernet().decrypt(token.encode()).decode()
