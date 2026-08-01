import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class StrongPasswordValidator:
    """
    Custom password validator requiring:
    - At least 8 characters
    - At least one digit
    """

    def __init__(self, min_length=8):
        self.min_length = min_length

    def validate(self, password, user=None):
        if len(password) < self.min_length:
            raise ValidationError(
                _(f'Password must be at least {self.min_length} characters long.'),
                code='password_too_short',
            )
        if not re.search(r'\d', password):
            raise ValidationError(
                _('Password must contain at least one number.'),
                code='password_no_digit',
            )

    def get_help_text(self):
        return _(
            'Your password must contain at least 8 characters and at least one number.'
        )
