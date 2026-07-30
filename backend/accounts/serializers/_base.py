def full_name(user):
    """Return 'Title First Last' if available, otherwise 'First Last' or username."""
    if not user:
        return ''

    title = ""
    try:
        if hasattr(user, 'profile') and user.profile.title:
            title = user.profile.title + " "
    except Exception:
        pass

    if user.first_name and user.last_name:
        return f"{title}{user.first_name} {user.last_name}".strip()
    if user.first_name:
        return f"{title}{user.first_name}".strip()
    return user.username
