from typing import Optional

from django.core.mail import get_connection

from .strategies.database_strategy import DatabaseEmailConfigurationStrategy
from .strategies.env_strategy import EnvEmailConfigurationStrategy


def default_strategies() -> list:
    return [DatabaseEmailConfigurationStrategy(), EnvEmailConfigurationStrategy()]


def resolve_email_config(strategies: Optional[list] = None) -> Optional[dict]:
    for strategy in strategies if strategies is not None else default_strategies():
        config = strategy.get_config()
        if config:
            return config
    return None


def build_connection(config: dict):
    return get_connection(
        backend=config.get('backend') or None,
        host=config.get('host'),
        port=config.get('port'),
        username=config.get('username'),
        password=config.get('password'),
        use_tls=config.get('use_tls'),
        use_ssl=config.get('use_ssl'),
    )


def get_email_connection(config: Optional[dict] = None):
    config = config if config is not None else resolve_email_config()
    if not config:
        return None
    return build_connection(config)
