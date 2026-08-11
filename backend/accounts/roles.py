"""
Centralized RBAC constants for the KNHS School Portal.

Import from here instead of hardcoding role strings:
    from accounts.roles import Role, AdminRoles, StaffRoles, StudentRoles, ParentRoles
"""


class Role:
    """User role constants — matches User.ROLE_CHOICES."""
    ADMIN = 'admin'
    STAFF = 'staff'
    STUDENT = 'student'
    PARENT = 'parent'

    ALL = (ADMIN, STAFF, STUDENT, PARENT)

    LABELS = {
        ADMIN: 'Admin',
        STAFF: 'Staff',
        STUDENT: 'Student',
        PARENT: 'Parent',
    }


class AdminRoles:
    """Role checks for admin-only operations."""
    CAN_MANAGE_USERS = (Role.ADMIN,)
    CAN_MANAGE_SYSTEM = (Role.ADMIN,)
    CAN_MANAGE_ENROLLMENT = (Role.ADMIN,)
    CAN_VIEW_AUDIT_LOGS = (Role.ADMIN,)
    CAN_MANAGE_BACKUPS = (Role.ADMIN,)
    CAN_MANAGE_WEBSITE = (Role.ADMIN,)
    CAN_MANAGE_SCHEDULE = (Role.ADMIN,)
    CAN_MANAGE_SUBJECTS = (Role.ADMIN,)
    CAN_MANAGE_GRADES = (Role.ADMIN,)
    CAN_MANAGE_TICKETS = (Role.ADMIN,)


class StaffRoles:
    """Role checks for staff/teacher operations."""
    CAN_MARK_ATTENDANCE = (Role.ADMIN, Role.STAFF)
    CAN_MANAGE_GRADES = (Role.ADMIN, Role.STAFF)
    CAN_MANAGE_ANNOUNCEMENTS = (Role.ADMIN, Role.STAFF)
    CAN_MANAGE_MATERIALS = (Role.ADMIN, Role.STAFF)
    CAN_VIEW_REPORTS = (Role.ADMIN, Role.STAFF)
    CAN_MANAGE_STUDENTS = (Role.ADMIN, Role.STAFF)
    CAN_MANAGE_CLASSES = (Role.ADMIN, Role.STAFF)
    CAN_MANAGE_SCHEDULE = (Role.ADMIN, Role.STAFF)


class StudentRoles:
    """Role checks for student operations."""
    CAN_VIEW_OWN_GRADES = (Role.STUDENT,)
    CAN_SUBMIT_ASSIGNMENTS = (Role.STUDENT,)
    CAN_VIEW_ANNOUNCEMENTS = (Role.ADMIN, Role.STAFF, Role.STUDENT)
    CAN_COMMENT_ANNOUNCEMENTS = (Role.ADMIN, Role.STAFF, Role.STUDENT)


class ParentRoles:
    """Role checks for parent operations."""
    CAN_VIEW_CHILD_GRADES = (Role.PARENT,)
    CAN_VIEW_CHILD_ATTENDANCE = (Role.PARENT,)
    CAN_VIEW_CHILD_SCHEDULE = (Role.PARENT,)


# Frontend-compatible role mappings
ROLE_HOME = {
    Role.ADMIN: '/dashboard',
    Role.STAFF: '/dashboard',
    Role.STUDENT: '/dashboard',
    Role.PARENT: '/parent-dashboard',
}

ROUTE_ACCESS = {
    'academics-hub': (Role.ADMIN, Role.STAFF, Role.STUDENT),
    'enrollment-classes': (Role.ADMIN,),
    'grading-suite': (Role.ADMIN, Role.STAFF, Role.STUDENT),
    'people-directory': (Role.ADMIN, Role.STAFF),
    'system-admin': (Role.ADMIN,),
    'communication-center': Role.ALL,
    'dashboard': Role.ALL,
    'announcements': Role.ALL,
    'attendance': (Role.ADMIN, Role.STAFF),
    'materials': (Role.ADMIN, Role.STAFF, Role.STUDENT),
    'messages': Role.ALL,
    'subjects': (Role.ADMIN,),
    'teachers': (Role.ADMIN,),
    'profile': Role.ALL,
    'class-members': (Role.ADMIN, Role.STAFF),
    'portal-calendar': Role.ALL,
    'password-reset': (Role.PARENT,),
    'class-management': (Role.ADMIN,),
    'my-classes': (Role.STAFF,),
    'student-enrollment': (Role.ADMIN,),
    'student-management': (Role.ADMIN, Role.STAFF),
    'audit-logs': (Role.ADMIN,),
    'backups': (Role.ADMIN,),
    'website-content': (Role.ADMIN,),
    'enrollment-management': (Role.ADMIN,),
    'settings': (Role.ADMIN, Role.STAFF, Role.STUDENT),
    'grade-input': (Role.ADMIN, Role.STAFF),
    'grades': (Role.ADMIN,),
    'grade-management': (Role.ADMIN,),
    'student-grades': (Role.STUDENT,),
    'moderation': (Role.ADMIN,),
    'analytics': (Role.ADMIN, Role.STAFF),
    'system-health': (Role.ADMIN,),
    'notifications': Role.ALL,
    'schedule-management': (Role.ADMIN,),
    'schedule': (Role.STAFF, Role.STUDENT),
    'parent-dashboard': (Role.PARENT,),
    'parent-management': (Role.ADMIN,),
}


def has_role(user, *roles):
    """Check if user has one of the specified roles."""
    return user.role in roles


def is_admin(user):
    return user.role == Role.ADMIN or getattr(user, 'is_admin', False) or getattr(user, 'is_superuser', False)


def is_staff(user):
    return user.role == Role.STAFF


def is_student(user):
    return user.role == Role.STUDENT


def is_parent(user):
    return user.role == Role.PARENT


def is_admin_or_staff(user):
    return user.role in (Role.ADMIN, Role.STAFF) or getattr(user, 'is_admin', False)
