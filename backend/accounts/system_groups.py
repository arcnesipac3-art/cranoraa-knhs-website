"""
System group synchronization service.

Creates and maintains chat groups that automatically mirror the school's
academic structure: Classroom groups, Subject groups, Department groups,
and a Faculty group.
"""
import logging

from django.contrib.auth import get_user_model
from django.db import transaction

from .models import (
    ChatRoom, ChatMember, Classroom, Subject, ClassroomSubject, Department,
    StudentClassEnrollment,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def _get_or_create_system_room(source_type, source_id, name, description='', owner=None):
    """Get or create a system group room. Returns (room, created)."""
    room = ChatRoom.objects.filter(
        source_type=source_type,
        source_id=source_id,
        is_group=True,
    ).first()

    if room:
        changed = False
        if room.name != name:
            room.name = name
            changed = True
        if description and room.description != description:
            room.description = description
            changed = True
        if owner and room.owner_id != owner.id:
            room.owner = owner
            changed = True
        if changed:
            room.save(update_fields=['name', 'description', 'owner', 'updated_at'])
        return room, False

    room = ChatRoom.objects.create(
        name=name,
        description=description,
        is_group=True,
        group_type='system',
        source_type=source_type,
        source_id=source_id,
        created_by=owner,
        owner=owner,
    )
    return room, True


def _sync_room_members(room, user_ids, role_map=None):
    """
    Sync members of a system room to match the given user_ids.
    role_map: dict mapping user_id -> role string ('owner', 'admin', 'member')
    Returns (added, removed) counts.
    """
    if role_map is None:
        role_map = {}

    current_member_ids = set(room.participants.values_list('id', flat=True))
    target_ids = set(user_ids)

    to_add = target_ids - current_member_ids
    to_remove = current_member_ids - target_ids

    if to_remove:
        room.participants.remove(*User.objects.filter(id__in=to_remove))
        ChatMember.objects.filter(chat_room=room, user_id__in=to_remove).delete()

    if to_add:
        room.participants.add(*User.objects.filter(id__in=to_add))
        members_to_create = [
            ChatMember(
                chat_room=room,
                user_id=uid,
                role=role_map.get(uid, 'member'),
            )
            for uid in to_add
        ]
        ChatMember.objects.bulk_create(members_to_create, ignore_conflicts=True)

    # Update roles for existing members
    for uid, role in role_map.items():
        if uid in current_member_ids and uid not in to_add:
            ChatMember.objects.filter(
                chat_room=room, user_id=uid, role__in=['owner', 'admin', 'member']
            ).exclude(role=role).update(role=role)

    return len(to_add), len(to_remove)


# ─── Classroom Groups ────────────────────────────────────────────────────────

def sync_classroom_group(classroom):
    """
    Create or update a system group for a classroom.
    Members: advisory teacher + all enrolled students.
    """
    teacher_user = classroom.teacher
    if not teacher_user:
        return None

    enrolled_student_ids = list(
        StudentClassEnrollment.objects.filter(
            classroom=classroom
        ).values_list('student_id', flat=True)
    )

    participant_ids = [teacher_user.id] + enrolled_student_ids
    if not participant_ids:
        return None

    room, created = _get_or_create_system_room(
        source_type='classroom',
        source_id=classroom.id,
        name=classroom.name,
        description=f'Classroom group for {classroom.name}',
        owner=teacher_user,
    )

    role_map = {teacher_user.id: 'owner'}
    _sync_room_members(room, participant_ids, role_map)

    action = 'Created' if created else 'Updated'
    logger.info(f'{action} classroom group: {classroom.name} ({len(participant_ids)} members)')
    return room


def remove_classroom_group(classroom):
    """Remove the system group for a classroom."""
    ChatRoom.objects.filter(
        source_type='classroom',
        source_id=classroom.id,
        is_group=True,
    ).delete()
    logger.info(f'Removed classroom group for: {classroom.name}')


# ─── Subject Groups ──────────────────────────────────────────────────────────

def sync_subject_group(classroom_subject):
    """
    Create or update a system group for a subject in a classroom.
    Members: subject teacher + all students in the classroom.
    """
    teacher = classroom_subject.teacher
    classroom = classroom_subject.classroom
    subject = classroom_subject.subject

    if not teacher:
        return None

    enrolled_student_ids = list(
        StudentClassEnrollment.objects.filter(
            classroom=classroom
        ).values_list('student_id', flat=True)
    )

    participant_ids = [teacher.id] + enrolled_student_ids
    if not participant_ids:
        return None

    name = f'{subject.name} - {classroom.name}'
    room, created = _get_or_create_system_room(
        source_type='subject',
        source_id=classroom_subject.id,
        name=name,
        description=f'{subject.name} class group for {classroom.name}',
        owner=teacher,
    )

    role_map = {teacher.id: 'owner'}
    _sync_room_members(room, participant_ids, role_map)

    action = 'Created' if created else 'Updated'
    logger.info(f'{action} subject group: {name} ({len(participant_ids)} members)')
    return room


def remove_subject_group(classroom_subject):
    """Remove the system group for a classroom-subject."""
    ChatRoom.objects.filter(
        source_type='subject',
        source_id=classroom_subject.id,
        is_group=True,
    ).delete()
    logger.info(f'Removed subject group for: {classroom_subject}')


# ─── Department Groups ───────────────────────────────────────────────────────

def sync_department_group(department):
    """
    Create or update a system group for a department.
    Members: department head + all staff users (department members are determined
    by staff_title matching the department name, or all staff if no mapping).
    """
    head = department.head
    if not head:
        return None

    # Get all staff members (department membership based on staff_title matching department name)
    all_staff = User.objects.filter(role='staff', is_active=True)
    participant_ids = list(all_staff.values_list('id', flat=True))

    if head.id not in participant_ids:
        participant_ids.append(head.id)

    if not participant_ids:
        return None

    room, created = _get_or_create_system_room(
        source_type='department',
        source_id=department.id,
        name=department.name,
        description=department.description or f'{department.name} department group',
        owner=head,
    )

    role_map = {head.id: 'owner'}
    _sync_room_members(room, participant_ids, role_map)

    action = 'Created' if created else 'Updated'
    logger.info(f'{action} department group: {department.name} ({len(participant_ids)} members)')
    return room


def remove_department_group(department):
    """Remove the system group for a department."""
    ChatRoom.objects.filter(
        source_type='department',
        source_id=department.id,
        is_group=True,
    ).delete()
    logger.info(f'Removed department group for: {department.name}')


# ─── Faculty Group ───────────────────────────────────────────────────────────

def sync_faculty_group():
    """
    Create or update the global Faculty & Staff group.
    Members: all staff and admin users.
    """
    admin_users = User.objects.filter(role='admin', is_active=True)
    staff_users = User.objects.filter(role='staff', is_active=True)

    participant_ids = list(admin_users.values_list('id', flat=True)) + list(staff_users.values_list('id', flat=True))
    if not participant_ids:
        return None

    # Use first admin as owner
    owner = admin_users.first() or staff_users.first()

    room, created = _get_or_create_system_room(
        source_type='faculty',
        source_id=1,
        name='Faculty & Staff',
        description='Global group for all faculty and staff members',
        owner=owner,
    )

    role_map = {owner.id: 'owner'}
    _sync_room_members(room, participant_ids, role_map)

    action = 'Created' if created else 'Updated'
    logger.info(f'{action} faculty group ({len(participant_ids)} members)')
    return room


# ─── Full Sync ───────────────────────────────────────────────────────────────

def sync_all_system_groups():
    """
    Full sync of all system groups.
    Call this after bulk data imports, or periodically.
    """
    stats = {
        'classrooms': 0,
        'subjects': 0,
        'departments': 0,
        'faculty': 0,
    }

    # Sync classroom groups
    for classroom in Classroom.objects.select_related('teacher').all():
        if classroom.teacher:
            room = sync_classroom_group(classroom)
            if room:
                stats['classrooms'] += 1

    # Sync subject groups
    for cs in ClassroomSubject.objects.select_related('teacher', 'classroom', 'subject').all():
        if cs.teacher:
            room = sync_subject_group(cs)
            if room:
                stats['subjects'] += 1

    # Sync department groups
    for dept in Department.objects.filter(is_active=True).select_related('head').all():
        if dept.head:
            room = sync_department_group(dept)
            if room:
                stats['departments'] += 1

    # Sync faculty group
    room = sync_faculty_group()
    if room:
        stats['faculty'] += 1

    logger.info(f'System group sync complete: {stats}')
    return stats
