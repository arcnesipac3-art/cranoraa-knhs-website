"""
Signal handlers to keep system groups in sync with academic structure changes.

Auto-syncs when:
- Classroom is created/updated/deleted
- ClassroomSubject is created/updated/deleted
- Department is created/updated/deleted
- StudentClassEnrollment is created/deleted
"""
import logging

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from ..models import Classroom, ClassroomSubject, Department, StudentClassEnrollment

logger = logging.getLogger(__name__)


# ─── Classroom Signals ───────────────────────────────────────────────────────

@receiver(post_save, sender=Classroom)
def classroom_post_save(sender, instance, created, **kwargs):
    """Sync classroom group when a classroom is saved."""
    from ..system_groups import sync_classroom_group
    if instance.teacher:
        try:
            sync_classroom_group(instance)
        except Exception as e:
            logger.error(f'Failed to sync classroom group for {instance.name}: {e}')


@receiver(post_delete, sender=Classroom)
def classroom_post_delete(sender, instance, **kwargs):
    """Remove classroom group when a classroom is deleted."""
    from ..system_groups import remove_classroom_group
    try:
        remove_classroom_group(instance)
    except Exception as e:
        logger.error(f'Failed to remove classroom group for {instance.name}: {e}')


# ─── ClassroomSubject Signals ────────────────────────────────────────────────

@receiver(post_save, sender=ClassroomSubject)
def classroom_subject_post_save(sender, instance, created, **kwargs):
    """Sync subject group when a classroom-subject is saved."""
    from ..system_groups import sync_subject_group
    if instance.teacher:
        try:
            sync_subject_group(instance)
        except Exception as e:
            logger.error(f'Failed to sync subject group for {instance}: {e}')


@receiver(post_delete, sender=ClassroomSubject)
def classroom_subject_post_delete(sender, instance, **kwargs):
    """Remove subject group when a classroom-subject is deleted."""
    from ..system_groups import remove_subject_group
    try:
        remove_subject_group(instance)
    except Exception as e:
        logger.error(f'Failed to remove subject group for {instance}: {e}')


# ─── Department Signals ──────────────────────────────────────────────────────

@receiver(post_save, sender=Department)
def department_post_save(sender, instance, created, **kwargs):
    """Sync department group when a department is saved."""
    from ..system_groups import sync_department_group
    if instance.head and instance.is_active:
        try:
            sync_department_group(instance)
        except Exception as e:
            logger.error(f'Failed to sync department group for {instance.name}: {e}')


@receiver(post_delete, sender=Department)
def department_post_delete(sender, instance, **kwargs):
    """Remove department group when a department is deleted."""
    from ..system_groups import remove_department_group
    try:
        remove_department_group(instance)
    except Exception as e:
        logger.error(f'Failed to remove department group for {instance.name}: {e}')


# ─── Enrollment Signals ──────────────────────────────────────────────────────

@receiver(post_save, sender=StudentClassEnrollment)
def enrollment_post_save(sender, instance, created, **kwargs):
    """Re-sync classroom group when a student enrolls."""
    from ..system_groups import sync_classroom_group
    classroom = instance.classroom
    if classroom.teacher:
        try:
            sync_classroom_group(classroom)
        except Exception as e:
            logger.error(f'Failed to sync classroom group after enrollment: {e}')


@receiver(post_delete, sender=StudentClassEnrollment)
def enrollment_post_delete(sender, instance, **kwargs):
    """Re-sync classroom group when a student unenrolls."""
    from ..system_groups import sync_classroom_group
    classroom = instance.classroom
    if classroom.teacher:
        try:
            sync_classroom_group(classroom)
        except Exception as e:
            logger.error(f'Failed to sync classroom group after unenrollment: {e}')
