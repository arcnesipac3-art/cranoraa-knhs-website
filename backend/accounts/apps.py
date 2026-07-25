import time
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    server_started_at: float = 0

    def ready(self):
        AccountsConfig.server_started_at = time.time()