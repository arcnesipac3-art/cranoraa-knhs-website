from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        import accounts.signals  # noqa: F401

        # Compose department module access into DRF's permission check for
        # every view. Role checks still run first and are never weakened —
        # see accounts.access (Decision §11-A: departments restrict only).
        from .access import install_module_gate
        install_module_gate()