"""Effective department module access and backend enforcement.

Decision §11-A — **departments only ever RESTRICT**::

    access(view, user) = role_permits(view)  AND  (admin  OR  module in departments)

This file therefore *never grants* anything: it can only deny an endpoint the
view's own role-based permission classes already allowed. Role gates stay the
first and authoritative layer, so handing a department a module can never
escalate a staff account into admin-only territory.

Effective access for one user
-----------------------------
* ``admin`` (``role=='admin'`` / ``is_admin`` / ``is_superuser``) -> everything.
  Mirrors ``accounts.permissions.IsAdmin`` exactly, so administrators can never
  be locked out of system management by configuring departments.
* ``student`` / ``parent`` -> everything. They are never assigned to a
  department (enforced in ``UserSerializer``), so gating them would lock them
  out of their own portal. Their role gates are unchanged.
* staff with **no** departments -> everything. Not managed yet, so deploying
  this feature changes nothing for existing accounts.
* staff whose departments are all **unconfigured** (``module_keys is None``)
  -> everything. Same reason: no regression for departments created before
  this feature existed.
* otherwise -> the **union** of every department's granted modules, deduplicated
  (TEST 3). A department with ``module_keys == []`` grants nothing.

Enforcement is installed once in ``accounts.apps`` by :func:`install_module_gate`,
which composes with — never replaces — whatever permission classes a view
already declares.
"""
from rest_framework.permissions import BasePermission

from .modules import MODULE_KEY_SET, MODULE_KEYS
from .roles import Role


def is_admin_user(user) -> bool:
    """Admin override — identical to accounts.permissions.IsAdmin."""
    return bool(
        user
        and (
            getattr(user, 'role', None) == Role.ADMIN
            or getattr(user, 'is_admin', False)
            or getattr(user, 'is_superuser', False)
        )
    )


def effective_module_keys(user):
    """The set of portal modules ``user`` may reach.

    Always returns a frozenset of keys from the registry. See the module
    docstring for the rules.
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return frozenset()

    if is_admin_user(user):
        return MODULE_KEY_SET

    # Students/parents are never department members.
    if getattr(user, 'role', None) in (Role.STUDENT, Role.PARENT):
        return MODULE_KEY_SET

    try:
        departments = list(user.departments.all())
    except Exception:
        # Any failure to read membership must not lock the user out; the
        # role-based layer still governs the request.
        return MODULE_KEY_SET

    if not departments:
        return MODULE_KEY_SET

    granted = set()
    for dept in departments:
        keys = getattr(dept, 'module_keys', None)
        if keys is None:
            # Unconfigured department -> grants everything it is allowed to.
            return MODULE_KEY_SET
        granted.update(keys)

    return frozenset(granted) & MODULE_KEY_SET


# ── Endpoint -> module maps ─────────────────────────────────────────────────
# Router viewsets are keyed by DRF basename. Each value is the set of modules
# ANY of which grants access — departments choose which modules a group needs.
VIEWSET_MODULES = {
    # People
    'user': ('people',),
    'department': ('departments',),
    'module': ('departments',),

    # Academics
    'classroom': ('classes',),
    'subject': ('subjects',),
    'classroom-subject': ('subjects',),
    'schedule': ('schedules',),
    'time-slot': ('schedules',),
    'academic-year': ('academic-setup',),
    'semester': ('academic-setup',),

    # Enrollment
    'enrollment': ('enrollment',),
    'enrollment-application': ('enrollment',),
    'enrollment-waitlist': ('enrollment',),

    # Grades
    'grade': ('grade-management',),
    'grade-report': ('grade-management',),
    'grade-submission': ('grade-management',),
    'grading-period': ('grade-management',),
    'grade-reopening-request': ('grade-management',),

    # Attendance
    'attendance': ('attendance-monitoring', 'attendance-dashboard'),
    'attendance-deadline': ('attendance-monitoring', 'attendance-dashboard'),
    'absence-excuse': ('excuse-slips',),

    # Records
    'compliance-type': ('compliance',),
    'compliance-submission': ('compliance',),

    # Communication
    'announcement': ('announcements',),
    'notification': ('notifications',),
    'chat-room': ('messages',),
    'chat-message': ('messages',),
    'chat-report': ('messages',),
    'room': ('messages',),
    'school-calendar': ('calendar',),

    # System
    'website-content': ('website-editor',),
    'audit-log': ('audit-logs',),
    'backup': ('backups',),
    'storage': ('system-health',),
}

# Function-based (@api_view) endpoints are keyed by the Django url `name=`.
URL_MODULES = {
    # System — the modules called out explicitly in the brief
    'system_metrics': ('system-health',),
    'maintenance_feed': ('system-health',),
    'maintenance_mode': ('system-health',),
    'maintenance_status': ('system-health',),
    'force_sync': ('system-health',),

    'run_backup': ('backups',),
    'run_backup_enhanced': ('backups',),
    'clear_cache': ('backups',),
    'data_retention': ('backups',),

    'system_settings': ('settings',),

    'admin_stats': ('analytics',),
    'admin_attendance_analytics': ('analytics',),
    'admin_grade_analytics': ('analytics',),
    'grade_distribution_stats': ('analytics',),
    'storage_analytics': ('analytics',),

    'admin_create_user': ('people',),

    # Records
    'compliance_dashboard': ('compliance',),
    'my_compliance_status': ('compliance',),
    'check_overdue_submissions': ('compliance',),
    'trigger_compliance_reminders': ('compliance',),
    'sync_teacher_submissions': ('compliance',),
    'legacy_submissions': ('compliance',),
    'bulk_assign_classroom_subject': ('compliance',),
    'compliance_audit_trail': ('compliance',),

    # Operations
    'pending-fees': ('enrollment',),
    'teacher-progress': ('enrollment',),
}


def _url_name(request):
    if request is None:
        return None
    django_request = getattr(request, '_request', request)
    match = getattr(django_request, 'resolver_match', None)
    return getattr(match, 'url_name', None)


def module_keys_for(view, request=None):
    """Modules any one of which unlocks ``view``; ``None`` = not gated.

    Identity/cross-cutting endpoints that everyone needs regardless of module
    (``v1/profile/`` auth bootstrap, ``v1/login/``, ``v1/token/``, health,
    public announcements, ``v1/modules/`` meta) are deliberately absent so the
    portal keeps working for accounts that have never been assigned a
    department.
    """
    basename = getattr(view, 'basename', None)
    if basename:
        return VIEWSET_MODULES.get(basename)
    name = _url_name(request)
    if name:
        return URL_MODULES.get(name)
    return None


class ModuleAccess(BasePermission):
    """Deny an endpoint when none of the user's departments grant its module.

    Appended to every DRF view's permission chain (see ``install_module_gate``)
    *after* the view's own checks, so role/authentication error messages are
    unchanged for anyone who was already unauthorised.
    """
    message = 'Your department does not grant access to this module.'
    code = 'module_access'

    def has_permission(self, request, view):
        allowed = module_keys_for(view, request)
        if not allowed:
            return True                      # not a department-gated endpoint

        user = getattr(request, 'user', None)
        if user is None or not getattr(user, 'is_authenticated', False):
            # Let the view's own permission classes own anonymous behaviour
            # (public endpoints stay public).
            return True

        if is_admin_user(user):
            return True                      # admin override

        if getattr(user, 'role', None) in (Role.STUDENT, Role.PARENT):
            return True                      # never department members

        granted = effective_module_keys(user)
        return bool(set(allowed) & granted)


_GATE_ATTR = '_knhs_module_gate_installed'


def install_module_gate():
    """Compose module gating into DRF's permission check, once.

    ``check_permissions`` is the one place every DRF view passes through —
    router viewsets *and* ``@api_view`` function views — and unlike
    ``DEFAULT_PERMISSION_CLASSES`` it is not overridden by the ~99 views in
    this project that declare their own ``permission_classes``.

    The original method runs first: role and authentication failures behave
    exactly as before, and this gate can only add a denial on top.
    """
    from rest_framework.views import APIView

    if getattr(APIView, _GATE_ATTR, False):
        return

    original = APIView.check_permissions

    def check_permissions(self, request):
        original(self, request)
        if not ModuleAccess().has_permission(request, self):
            self.permission_denied(
                request,
                ModuleAccess.message,
                ModuleAccess.code,
            )

    APIView.check_permissions = check_permissions
    setattr(APIView, _GATE_ATTR, True)


__all__ = [
    'MODULE_KEYS',
    'ModuleAccess',
    'URL_MODULES',
    'VIEWSET_MODULES',
    'effective_module_keys',
    'is_admin_user',
    'install_module_gate',
    'module_keys_for',
]
