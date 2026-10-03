/**
 * Portal module registry — frontend mirror.
 *
 * The authoritative copy lives in `backend/accounts/modules.py` and is served
 * by `GET /api/v1/modules/`. That endpoint is the source of truth for the
 * module-access editor (it fetches fresh labels and grouping), while this
 * constant exists so the sidebar and route guards can decide what to render
 * without waiting on a request, and so the app degrades gracefully if the
 * request fails.
 *
 * Keep the keys, labels and order in step with the backend file. Keys are the
 * only thing ever persisted (`Department.module_keys`).
 *
 * A module key is a *restriction*, never a grant: it can only narrow what the
 * account's role already allows (Decision §11-A — departments restrict).
 */

export const MODULE_GROUPS = [
  { key: 'academics', label: 'Academics' },
  { key: 'people', label: 'People' },
  { key: 'enrollment', label: 'Enrollment' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'records', label: 'Records' },
  { key: 'communication', label: 'Communication' },
  { key: 'system', label: 'System' },
];

export const MODULES = [
  // ── Academics ─────────────────────────────────────────────────────────────
  { key: 'academic-setup', label: 'Academic Setup', group: 'academics' },
  { key: 'grade-management', label: 'Grade Management', group: 'academics' },
  { key: 'classes', label: 'Classes', group: 'academics' },
  { key: 'subjects', label: 'Subjects', group: 'academics' },
  { key: 'schedules', label: 'Schedules', group: 'academics' },

  // ── People ────────────────────────────────────────────────────────────────
  { key: 'people', label: 'People Directory', group: 'people' },
  { key: 'departments', label: 'Departments', group: 'people' },

  // ── Enrollment ────────────────────────────────────────────────────────────
  { key: 'enrollment', label: 'Enrollment', group: 'enrollment' },

  // ── Attendance ────────────────────────────────────────────────────────────
  { key: 'attendance-monitoring', label: 'Attendance Monitoring', group: 'attendance' },
  { key: 'attendance-dashboard', label: 'Attendance Dashboard', group: 'attendance' },
  { key: 'excuse-slips', label: 'Excuse Slips', group: 'attendance' },
  { key: 'attendance-audit', label: 'Attendance Audit Trail', group: 'attendance' },

  // ── Records ───────────────────────────────────────────────────────────────
  { key: 'compliance', label: 'Compliance', group: 'records' },

  // ── Communication ─────────────────────────────────────────────────────────
  { key: 'announcements', label: 'Announcements', group: 'communication' },
  { key: 'messages', label: 'Messages', group: 'communication' },
  { key: 'notifications', label: 'Notifications', group: 'communication' },
  { key: 'calendar', label: 'Calendar', group: 'communication' },

  // ── System ────────────────────────────────────────────────────────────────
  { key: 'system-admin', label: 'Admin Hub', group: 'system' },
  { key: 'analytics', label: 'Analytics', group: 'system' },
  { key: 'audit-logs', label: 'Audit Logs', group: 'system' },
  { key: 'backups', label: 'Backups', group: 'system' },
  { key: 'website-editor', label: 'Website Editor', group: 'system' },
  { key: 'moderation', label: 'Moderation', group: 'system' },
  { key: 'system-health', label: 'System Health', group: 'system' },
  { key: 'settings', label: 'Settings', group: 'system' },
];

/** Every key, in registry order. */
export const MODULE_KEYS = MODULES.map((m) => m.key);

/** key -> label, for rendering a saved grant. */
export const MODULE_LABELS = MODULES.reduce(
  (acc, m) => ({ ...acc, [m.key]: m.label }),
  {},
);

/**
 * Normalise any registry payload (local or from GET /v1/modules/) into
 * `[{ key, label, modules: [{ key, label }] }]`, preserving registry order and
 * dropping keys we do not recognise.
 */
export function normalizeGroups(groups) {
  const hasPayload = Array.isArray(groups)
    && groups.length > 0
    && groups.some((g) => Array.isArray(g.modules) && g.modules.length > 0);

  if (!hasPayload) {
    // No usable payload (endpoint unreachable / not fetched yet): fall back to
    // the built-in registry so the editor still renders the full list.
    return MODULE_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      modules: MODULES.filter((m) => m.group === g.key).map((m) => ({ key: m.key, label: m.label })),
    })).filter((g) => g.modules.length > 0);
  }

  return groups
    .map((g) => ({
      key: g.key,
      label: g.label,
      modules: (g.modules || [])
        .map((m) => ({ key: m.key, label: m.label || MODULE_LABELS[m.key] || m.key }))
        .filter((m) => MODULE_KEYS.includes(m.key)),
    }))
    .filter((g) => g.modules.length > 0);
}

/**
 * Human summary of a grant for a table cell / drawer.
 *
 * The backend always returns a concrete list (a department that has never been
 * configured comes back with every module), so this only has to describe counts.
 */
export function summarizeModules(keys, total = MODULE_KEYS.length) {
  const count = Array.isArray(keys) ? keys.length : 0;
  if (count === 0) return { count, text: 'No access', tone: 'none' };
  if (count >= total) return { count, text: `All ${total} modules`, tone: 'all' };
  if (count === 1) return { count, text: '1 module', tone: 'some' };
  return { count, text: `${count} modules`, tone: 'some' };
}

/**
 * Group an explicit set of module keys back into `MODULE_GROUPS` order, so a
 * saved grant can be read back in the same shape the editor writes it.
 * Groups with no selected module are omitted.
 */
export function groupSelected(keys) {
  const selected = new Set(keys || []);
  return MODULE_GROUPS.map((g) => ({
    ...g,
    modules: MODULES.filter((m) => m.group === g.key && selected.has(m.key)),
  })).filter((g) => g.modules.length > 0);
}

/**
 * Route path -> the portal module it belongs to.
 *
 * Only paths that genuinely sit behind a module are listed. Personal pages
 * (`/dashboard`, `/settings` as a staff account page, `/help`, `/my-classes`,
 * `/my-schedule`, `/password-reset`) and the school forms are deliberately
 * absent: they stay governed by role alone, exactly as before, so giving a
 * department a module can never take away someone's own profile page.
 *
 * The key must match the route key `ProtectedRoute` derives (the first path
 * segment, no query string), and the module key must exist in `MODULE_KEYS`.
 */
export const ROUTE_MODULES = {
  // Academics
  '/academic-setup': 'academic-setup',
  '/grade-management': 'grade-management',
  '/teacher-grade-dashboard': 'grade-management',
  '/classes': 'classes',
  '/subjects': 'subjects',
  '/schedules': 'schedules',

  // People
  '/people': 'people',
  '/departments': 'departments',

  // Enrollment
  '/enrollment': 'enrollment',

  // Attendance
  '/attendance-monitoring': 'attendance-monitoring',
  '/attendance-dashboard': 'attendance-dashboard',
  '/attendance-audit-trail': 'attendance-audit',
  '/excuse-slips': 'excuse-slips',

  // Records
  '/compliance': 'compliance',
  '/my-compliance': 'compliance',

  // Communication
  '/announcements': 'announcements',
  '/communication-center': 'messages',
  '/notifications': 'notifications',
  '/calendar': 'calendar',
  '/portal-calendar': 'calendar',

  // System
  '/analytics': 'analytics',
  '/system-admin': 'system-admin',
};

/** The module guarding a path, or null when the path is not module-gated. */
export function moduleForPath(pathname) {
  if (!pathname) return null;
  const path = String(pathname).split('?')[0].replace(/\/+$/, '');
  return ROUTE_MODULES[path] || null;
}

/**
 * Whether this account's department configuration allows `key`.
 *
 * Deliberately fail-open: `user.effective_modules` is only the frontend's
 * *mirror* of the backend's decision. If it has not arrived yet — first paint
 * before `/profile/` returns, or a session written before this feature — we
 * render the UI and let the API be the judge, which it still is. Hiding
 * nothing when we don't know is safer than locking a user out of their own
 * dashboard on a flaky response.
 *
 * `key === null/undefined` means the path is not module-gated at all.
 */
export function hasModuleAccess(user, key) {
  if (!key) return true;
  const granted = user?.effective_modules;
  if (!Array.isArray(granted)) return true;
  return granted.includes(key);
}
