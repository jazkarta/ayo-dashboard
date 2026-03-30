from django.contrib.auth import get_user_model
from coolname import generate


def format_username(words: list[str]) -> str:
    return "".join(word.capitalize() for word in words)

def generate_username() -> str:
    """
    Generate a unique username using the coolname library.
    Checks against the database to ensure it's not already in use.
    """
    User = get_user_model()
    while True:
        words = generate(2)
        username = format_username(words)
        if not User.objects.filter(username__iexact=username).exists():
            return username

def get_suggested_usernames(count: int = 4) -> list[str]:
    """
    Return a list of suggested unique usernames.
    """
    return [generate_username() for _ in range(count)]