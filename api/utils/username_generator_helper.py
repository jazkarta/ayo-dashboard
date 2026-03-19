from coolname import generate


def format_username(words: list[str]) -> str:
    return "".join(word.capitalize() for word in words)

def generate_username() -> str:
    """
    Generate a unique username using the coolname library.
    The generated username will be in the format of "adjective-noun-number".
    """
    words = generate(2)
    return format_username(words)