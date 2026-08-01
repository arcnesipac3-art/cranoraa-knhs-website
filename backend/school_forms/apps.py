from django.apps import AppConfig


class SchoolFormsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'school_forms'
    verbose_name = 'School Forms'

    def ready(self):
        import school_forms.signals  # noqa: F401