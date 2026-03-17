from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = 'users'

    def ready(self):
        import users.signals
        print("Accounts app ready: Keycloak sync signals connected.")
