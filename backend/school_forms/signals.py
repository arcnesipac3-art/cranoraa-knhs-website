import logging

logger = logging.getLogger(__name__)


def log_form_generation(sender, **kwargs):
    """Signal to log form generation"""
    logger.info(
        f"Form generated: {sender.__name__} by user {kwargs.get('user')}"
    )