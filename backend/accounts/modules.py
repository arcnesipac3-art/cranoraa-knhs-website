"""Canonical portal module registry (single source of truth).

Departments are not labels — they are *organisational access groups*: each one
may be granted a set of portal modules. This module is the authoritative list
of which portal modules exist, how they are grouped and how they are labelled.

Design notes
------------
* **Code is the source of truth, the database only stores keys.**
  ``Department.module_keys`` holds bare strings such as ``["enrollment"]``.
  Labels and grouping are never persisted, so the database can never drift
  away from the code that actually implements the module.

* **The list is derived from the real application**, not invented: every entry
  corresponds to a reachable route in ``frontend/src/constants/routes.js``, a
  sidebar entry in ``Layout.jsx``'s ``NAV_STRUCTURE``, or a ``/system-admin``
  hub tab. Modules that are *not* reachable (SF9/SF10, "Student Records",
  "Records Requests", "Reports") are deliberately absent rather than faked.

* **This file encodes no permission decisions.** Role gates remain the first
  and authoritative layer (``accounts.permissions`` + ``routes.js``). Module
  keys only ever *narrow* what a role already allows (Decision §11 = A:
  departments restrict, never expand), so nothing here can escalate privilege.

* Personal workspaces that every account has by virtue of its role (Dashboard,
  My Schedule, Profile, Help, force-password-change, ...) are intentionally
  excluded — they are not departmental resources and gating them would lock
  people out of their own landing page.
"""
from typing import NamedTuple, Optional, Sequence


class ModuleGroup(NamedTuple):
    """A logical grouping shown in the module-access UI."""
    key: str
    label: str


class Module(NamedTuple):
    """One grantable portal module."""
    key: str
    label: str
    group: str


#: Order here is the display order everywhere (API + UI).
MODULE_GROUPS = (
    ModuleGroup('academics', 'Academics'),
    ModuleGroup('people', 'People'),
    ModuleGroup('enrollment', 'Enrollment'),
    ModuleGroup('attendance', 'Attendance'),
    ModuleGroup('records', 'Records'),
    ModuleGroup('communication', 'Communication'),
    ModuleGroup('system', 'System'),
)


MODULES = (
    # ── Academics ───────────────────────────────────────────────────────────
    Module('academic-setup', 'Academic Setup', 'academics'),
    Module('grade-management', 'Grade Management', 'academics'),
    Module('classes', 'Classes', 'academics'),
    Module('subjects', 'Subjects', 'academics'),
    Module('schedules', 'Schedules', 'academics'),

    # ── People ──────────────────────────────────────────────────────────────
    Module('people', 'People Directory', 'people'),
    Module('departments', 'Departments', 'people'),

    # ── Enrollment ──────────────────────────────────────────────────────────
    Module('enrollment', 'Enrollment', 'enrollment'),

    # ── Attendance ──────────────────────────────────────────────────────────
    Module('attendance-monitoring', 'Attendance Monitoring', 'attendance'),
    Module('attendance-dashboard', 'Attendance Dashboard', 'attendance'),
    Module('excuse-slips', 'Excuse Slips', 'attendance'),
    Module('attendance-audit', 'Attendance Audit Trail', 'attendance'),

    # ── Records ─────────────────────────────────────────────────────────────
    Module('compliance', 'Compliance', 'records'),

    # ── Communication ───────────────────────────────────────────────────────
    Module('announcements', 'Announcements', 'communication'),
    Module('messages', 'Messages', 'communication'),
    Module('notifications', 'Notifications', 'communication'),
    Module('calendar', 'Calendar', 'communication'),

    # ── System ──────────────────────────────────────────────────────────────
    Module('system-admin', 'Admin Hub', 'system'),
    Module('analytics', 'Analytics', 'system'),
    Module('audit-logs', 'Audit Logs', 'system'),
    Module('backups', 'Backups', 'system'),
    Module('website-editor', 'Website Editor', 'system'),
    Module('moderation', 'Moderation', 'system'),
    Module('system-health', 'System Health', 'system'),
    Module('settings', 'Settings', 'system'),
)


#: Registry order is the canonical ordering for stored keys.
MODULE_KEYS = tuple(m.key for m in MODULES)
MODULE_KEY_SET = frozenset(MODULE_KEYS)

_LABEL_BY_KEY = {m.key: m.label for m in MODULES}
_GROUP_ORDER = {g.key: i for i, g in enumerate(MODULE_GROUPS)}
_MODULE_ORDER = {k: i for i, k in enumerate(MODULE_KEYS)}

# Keys a module belongs to, by group key.
MODULES_BY_GROUP = tuple(
    (g.key, g.label, tuple(m.key for m in MODULES if m.group == g.key))
    for g in MODULE_GROUPS
)


def is_known_module(key) -> bool:
    return isinstance(key, str) and key in MODULE_KEY_SET


def label_for(key: str) -> str:
    return _LABEL_BY_KEY.get(key, key)


def normalize_module_keys(raw) -> Optional[list]:
    """Validate and canonicalise a raw module-key collection.

    Returns
    -------
    ``None``
        "Not yet configured" — the department is unrestricted. This is the
        value for rows that predate the feature, so nobody gets locked out by
        an upgrade.
    ``list``
        A deduplicated list of known keys in registry order. An empty list
        means the department is explicitly granted nothing.

    Raises
    ------
    ValueError
        When ``raw`` is not a list, or contains an unknown module key.
    """
    if raw is None:
        return None

    if isinstance(raw, (str, bytes)) or not isinstance(raw, (list, tuple, set, frozenset)):
        raise ValueError('Module access must be a list of module keys.')

    unknown = sorted({k for k in raw if not is_known_module(k)})
    if unknown:
        raise ValueError(
            'Unknown module key(s): %s. Valid keys: %s'
            % (', '.join(unknown), ', '.join(MODULE_KEYS))
        )

    seen = set()
    keys = []
    for key in raw:
        if key not in seen:
            seen.add(key)
            keys.append(key)
    keys.sort(key=lambda k: _MODULE_ORDER[k])
    return keys


def effective_module_keys(department) -> Optional[list]:
    """The modules a department actually grants.

    ``module_keys is None`` (never configured) -> ``None``, meaning "all
    modules" so that departments which existed before this feature keep
    behaving exactly as they did before.
    """
    raw = getattr(department, 'module_keys', None)
    if raw is None:
        return None
    return normalize_module_keys(raw) or []


def registry_payload() -> list:
    """The registry as served by ``GET /api/v1/modules/``."""
    return [
        {
            'key': g.key,
            'label': g.label,
            'modules': [
                {'key': m.key, 'label': m.label}
                for m in MODULES
                if m.group == g.key
            ],
        }
        for g in MODULE_GROUPS
    ]


def ordered(keys: Sequence[str]) -> list:
    """Sort an arbitrary collection of known keys into registry order."""
    return sorted(keys, key=lambda k: _MODULE_ORDER.get(k, len(_MODULE_ORDER)))
