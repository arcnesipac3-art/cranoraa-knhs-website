"""The Department & Module Access feature — its 10 acceptance tests.

Run against a MIGRATED database::

    python verify_department_module_access.py

It defaults to the project settings; point ``DJANGO_SETTINGS_MODULE`` at your
own scratch module first if you don't want to touch development data.

    1.  Create a department with module access
    2.  A person may belong to several departments
    3.  Effective access = union of every department, deduplicated
    4.  A module the departments do not grant is refused at its URL
    5.  Removing module access removes it
    6.  Changing a user's departments changes their access
    7.  Archive-only: history kept, no new members, archived not selectable
    8.  Department membership never changes role / is_admin
    9.  Security: no escalation, students/parents excluded, writes admin-only
    10. Regression: the gate is still armed and the registry intact

Everything goes through `APIClient` so requests are resolved by the real URL
conf and pass through the real permission stack — nothing is stubbed.

Deliberately NOT named `test_*`: this is an opt-in script in the style of
`check_documents.py`, not part of `accounts/tests/`, so it does not move the
recorded 19-fail / 93-pass baseline of that suite.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_portal.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.views import APIView

from accounts.access import ModuleAccess, effective_module_keys
from accounts.models import Department
from accounts.modules import MODULE_KEYS, normalize_module_keys

User = get_user_model()
results = []


def check(label, ok, detail=''):
    results.append((label, bool(ok), str(detail)[:120]))


def rows(resp):
    """List endpoint payload, tolerant of pagination."""
    data = getattr(resp, 'data', None)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get('results') or []
    return []


def detail_of(resp):
    try:
        return (resp.json() or {}).get('detail', '') or ''
    except Exception:
        return ''


def client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


# ── Endpoint-map integrity ──────────────────────────────────────────────────
# A rename that no longer matches would silently leave an endpoint ungated, so
# both maps are checked against the live URL conf rather than trusted.
def _collect_names(patterns):
    names = set()
    for p in patterns:
        if hasattr(p, 'url_patterns'):          # include() / URLResolver
            names |= _collect_names(p.url_patterns)
        elif getattr(p, 'name', None):
            names.add(p.name)
    return names


from accounts.access import URL_MODULES, VIEWSET_MODULES  # noqa: E402
from accounts.urls import router as acc_router  # noqa: E402
from portal.urls import router as portal_router  # noqa: E402
from django.urls import get_resolver  # noqa: E402

router_basenames = set()
for _r in (acc_router, portal_router):
    for _u in _r.get_urls():
        if not _u.name:
            continue
        # Registered names are `{basename}-list` / `{basename}-detail`.
        router_basenames.add(_u.name.rsplit('-', 1)[0] if '-' in _u.name else _u.name)

_all_names = _collect_names(get_resolver().url_patterns)
_unknown_bases = sorted(set(VIEWSET_MODULES) - router_basenames)
_unknown_names = sorted(set(URL_MODULES) - _all_names)
check('map: every VIEWSET_MODULES key is a real router basename', not _unknown_bases,
      _unknown_bases)
check('map: every URL_MODULES key is a real url name', not _unknown_names,
      _unknown_names)
check('map: every mapped module exists in the registry',
      all(k in MODULE_KEYS
          for keys in list(VIEWSET_MODULES.values()) + list(URL_MODULES.values())
          for k in keys))
check('map: both maps together cover a meaningful number of endpoints',
      len(VIEWSET_MODULES) + len(URL_MODULES) >= 30,
      f'{len(VIEWSET_MODULES)} viewsets + {len(URL_MODULES)} urls')


try:
    admin = User.objects.create_user('s10_admin', 's10_admin@x.com', 'pw', role='admin')
    ac = client(admin)

    # ── 1. Create a department with module access ─────────────────────────────
    r = ac.post('/api/v1/departments/', {
        'name': 'S10 Enrollment Office', 'code': 'S10ENR',
        'modules': ['enrollment', 'people'],
    }, format='json')
    check('T1: department created with module access', r.status_code == 201,
          f'{r.status_code} {getattr(r, "data", "")}')
    d_enr = Department.objects.get(code='S10ENR')
    # Keys are canonicalised into registry order, not the order they were sent.
    check('T1: module_keys stored exactly as posted',
          d_enr.module_keys == normalize_module_keys(['enrollment', 'people']),
          d_enr.module_keys)
    check('T1: stored keys are the posted keys, reordered not altered',
          set(d_enr.module_keys) == {'enrollment', 'people'}, d_enr.module_keys)
    check('T1: API reads back the modules it was created with',
          sorted(r.data.get('modules') or []) == ['enrollment', 'people'],
          r.data.get('modules'))
    check('T1: module_count is computed, not stored',
          r.data.get('module_count') == 2, r.data.get('module_count'))

    r = ac.post('/api/v1/departments/', {'name': 'S10 Unconfigured', 'code': 'S10UNT'},
                format='json')
    check('T1: department created without module config', r.status_code == 201,
          f'{r.status_code} {getattr(r, "data", "")}')
    d_unt = Department.objects.get(code='S10UNT')
    check('T1: unconfigured stores NULL (grants everything, incl. future modules)',
          d_unt.module_keys is None, d_unt.module_keys)
    check('T1: unconfigured reports the full registry',
          sorted(r.data.get('modules') or []) == sorted(MODULE_KEYS))

    # ── 2. A person may belong to several departments ─────────────────────────
    r = ac.post('/api/v1/departments/', {
        'name': 'S10 Records', 'code': 'S10REC',
        'modules': ['people', 'announcements'],
    }, format='json')
    check('T2: second department created', r.status_code == 201, r.status_code)
    d_rec = Department.objects.get(code='S10REC')

    r = ac.post('/api/v1/departments/', {
        'name': 'S10 Grades', 'code': 'S10GRD',
        'modules': ['grade-management'],
    }, format='json')
    check('T2: third department created', r.status_code == 201, r.status_code)
    d_grd = Department.objects.get(code='S10GRD')

    staff = User.objects.create_user('s10_staff', 's10_staff@x.com', 'pw', role='staff')
    sc = client(staff)

    r = ac.post(f'/api/v1/departments/{d_enr.id}/assign_member/',
                {'user_id': staff.id}, format='json')
    check('T2: assign_member adds the first department',
          r.status_code == 200 and r.data.get('status') == 'assigned',
          f'{r.status_code} {getattr(r, "data", "")}')
    r = ac.post(f'/api/v1/departments/{d_rec.id}/assign_member/',
                {'user_id': staff.id}, format='json')
    check('T2: assign_member ADDS a second department instead of moving',
          r.status_code == 200 and r.data.get('status') == 'assigned',
          f'{r.status_code} {getattr(r, "data", "")}')
    check('T2: membership is both departments',
          set(staff.departments.values_list('id', flat=True)) == {d_enr.id, d_rec.id},
          sorted(staff.departments.values_list('id', flat=True)))

    r = ac.patch(f'/api/v1/users/{staff.id}/',
                 {'departments': [d_enr.id, d_rec.id]}, format='json')
    check('T2: PATCH accepts the full membership list', r.status_code == 200,
          f'{r.status_code} {getattr(r, "data", "")}')
    staff.refresh_from_db()   # the in-memory row predates these writes
    check('T2: legacy single FK mirrors a member of both',
          staff.department_id in (d_enr.id, d_rec.id), staff.department_id)

    # ── 3. Effective access = union, deduplicated ─────────────────────────────
    eff = effective_module_keys(staff)
    check('T3: union of both departments',
          eff == {'enrollment', 'people', 'announcements'}, sorted(eff))
    check('T3: `people` is in both departments but counted once',
          len(eff) == 3, len(eff))
    check('T3: /profile/ reports the same union to the browser',
          sorted(sc.get('/api/v1/profile/').data.get('effective_modules') or []) == sorted(eff),
          sc.get('/api/v1/profile/').data.get('effective_modules'))

    # ── 4. A module the departments do not grant is refused at its URL ────────
    d_enr.module_keys = ['people']          # drop 'enrollment'
    d_enr.save(update_fields=['module_keys'])
    r = sc.get('/api/v1/enrollments/')
    check('T4: direct URL without the module -> 403', r.status_code == 403, r.status_code)
    check('T4: the denial comes from the module gate',
          detail_of(r) == ModuleAccess.message, detail_of(r))

    d_enr.module_keys = ['enrollment', 'people']   # grant it back
    d_enr.save(update_fields=['module_keys'])
    r = sc.get('/api/v1/enrollments/')
    check('T4: the same URL opens once the module is granted', r.status_code != 403,
          r.status_code)

    # ── 5. Removing module access removes it ──────────────────────────────────
    d_enr.module_keys = ['people']
    d_enr.save(update_fields=['module_keys'])
    check('T5: removed module leaves effective access',
          'enrollment' not in effective_module_keys(staff),
          sorted(effective_module_keys(staff)))
    check('T5: the URL closes again', sc.get('/api/v1/enrollments/').status_code == 403)

    r = ac.post(f'/api/v1/departments/{d_rec.id}/remove_member/',
                {'user_id': staff.id}, format='json')
    check('T5: remove_member drops one department', r.status_code == 200,
          f'{r.status_code} {getattr(r, "data", "")}')
    check('T5: membership shrinks to the remaining department',
          set(staff.departments.values_list('id', flat=True)) == {d_enr.id},
          sorted(staff.departments.values_list('id', flat=True)))
    check('T5: effective access shrinks to that department',
          effective_module_keys(staff) == {'people'},
          sorted(effective_module_keys(staff)))

    # ── 6. Changing a user's departments changes their access ─────────────────
    r = ac.patch(f'/api/v1/users/{staff.id}/', {'departments': [d_grd.id]}, format='json')
    check('T6: departments can be replaced', r.status_code == 200,
          f'{r.status_code} {getattr(r, "data", "")}')
    check('T6: access follows the new department',
          effective_module_keys(staff) == {'grade-management'},
          sorted(effective_module_keys(staff)))
    staff.refresh_from_db()
    check('T6: legacy mirror follows the new membership',
          staff.department_id == d_grd.id, staff.department_id)

    ac.patch(f'/api/v1/users/{staff.id}/', {'departments': [d_enr.id]}, format='json')
    check('T6: moving back restores the previous access',
          effective_module_keys(staff) == {'people'},
          sorted(effective_module_keys(staff)))

    # ── 7. Archive-only: history kept, no new members ─────────────────────────
    # d_rec is still active, so it can be joined before it is archived — that
    # membership then has to survive the archive untouched.
    ac.post(f'/api/v1/departments/{d_rec.id}/assign_member/',
            {'user_id': staff.id}, format='json')
    check('T7: staff is in both departments before archiving',
          set(staff.departments.values_list('id', flat=True)) == {d_enr.id, d_rec.id})
    before_eff = effective_module_keys(staff)

    r = ac.patch(f'/api/v1/departments/{d_rec.id}/', {'is_active': False}, format='json')
    check('T7: department archived (no delete endpoint is used)',
          r.status_code == 200 and r.data.get('is_active') is False,
          f'{r.status_code} {getattr(r, "data", "")}')
    d_rec.refresh_from_db()
    check('T7: memberships survive the archive',
          set(staff.departments.values_list('id', flat=True)) == {d_enr.id, d_rec.id})
    check('T7: module config survives the archive',
          d_rec.module_keys == ['people', 'announcements'], d_rec.module_keys)
    check('T7: effective access is unchanged by archiving',
          effective_module_keys(staff) == before_eff,
          sorted(effective_module_keys(staff)))

    active_ids = {d['id'] for d in rows(ac.get('/api/v1/departments/', {'status': 'active'}))}
    all_ids = {d['id'] for d in rows(ac.get('/api/v1/departments/', {}))}
    check('T7: archived department hidden from the active list',
          d_rec.id not in active_ids and d_rec.id in all_ids,
          f'active={d_rec.id in active_ids} all={d_rec.id in all_ids}')

    newcomer = User.objects.create_user('s10_new', 's10_new@x.com', 'pw', role='staff')
    r = ac.post(f'/api/v1/departments/{d_rec.id}/assign_member/',
                {'user_id': newcomer.id}, format='json')
    check('T7: archived department refuses a NEW member (assign endpoint)',
          r.status_code == 400, f'{r.status_code} {getattr(r, "data", "")}')
    r = ac.patch(f'/api/v1/users/{newcomer.id}/', {'departments': [d_rec.id]}, format='json')
    check('T7: archived department refused as a NEW choice (user serializer)',
          r.status_code == 400, f'{r.status_code} {getattr(r, "data", "")}')
    check('T7: newcomer was left in no department',
          newcomer.departments.count() == 0, newcomer.departments.count())

    # Keeping an already-held archived membership alongside a new one is NOT a
    # new assignment, so this must still be editable.
    r = ac.patch(f'/api/v1/users/{staff.id}/',
                 {'departments': [d_rec.id, d_grd.id]}, format='json')
    check('T7: existing archived membership can be KEPT alongside a new one',
          r.status_code == 200, f'{r.status_code} {getattr(r, "data", "")}')
    check('T7: after that edit the archived membership is still present',
          set(staff.departments.values_list('id', flat=True)) == {d_rec.id, d_grd.id},
          sorted(staff.departments.values_list('id', flat=True)))

    # ── 8. Department membership never changes role / is_admin ────────────────
    before = (staff.role, staff.is_admin, staff.is_superuser)
    ac.patch(f'/api/v1/users/{staff.id}/', {'departments': []}, format='json')
    ac.patch(f'/api/v1/users/{staff.id}/', {'departments': [d_enr.id]}, format='json')
    staff.refresh_from_db()
    check('T8: role unchanged by membership changes', staff.role == before[0], staff.role)
    check('T8: is_admin unchanged by membership changes',
          staff.is_admin == before[1], staff.is_admin)
    check('T8: is_superuser unchanged by membership changes',
          staff.is_superuser == before[2], staff.is_superuser)

    # Use only ACTIVE departments here so the archived-department guard cannot
    # be what produces the 400 — the role guard has to be what fires.
    r_ok = ac.patch(f'/api/v1/users/{staff.id}/', {'departments': [d_grd.id]},
                    format='json')
    check('T8: control — the same department change alone succeeds',
          r_ok.status_code == 200, f'{r_ok.status_code} {getattr(r_ok, "data", "")}')
    staff.refresh_from_db()
    check('T8: control — that change landed',
          staff.departments.count() == 1, staff.departments.count())

    r = ac.patch(f'/api/v1/users/{staff.id}/',
                 {'departments': [d_enr.id], 'role': 'admin'}, format='json')
    check('T8: role cannot ride along with a department change', r.status_code == 400,
          f'{r.status_code} {getattr(r, "data", "")}')
    check('T8: the refusal names the role, not something else',
          'role' in str(getattr(r, 'data', '')).lower(), getattr(r, 'data', ''))
    staff.refresh_from_db()
    check('T8: role is still staff', staff.role == 'staff', staff.role)

    # ── 9. Security ───────────────────────────────────────────────────────────
    every = Department.objects.create(name='S10 Every', code='S10ALL',
                                      module_keys=list(MODULE_KEYS))
    ac.post(f'/api/v1/departments/{every.id}/assign_member/',
            {'user_id': staff.id}, format='json')
    r = sc.get('/api/v1/admin/system-metrics/')
    check('T9: holding every module still cannot reach an admin-only URL',
          r.status_code == 403, r.status_code)
    check('T9: that denial is role-based, not module-based',
          detail_of(r) != ModuleAccess.message, detail_of(r))
    check('T9: a full grant really is a full grant',
          effective_module_keys(staff) == set(MODULE_KEYS))

    for role in ('student', 'parent'):
        acct = User.objects.create_user(f's10_{role}', f's10_{role}@x.com', 'pw', role=role)
        r = ac.patch(f'/api/v1/users/{acct.id}/', {'departments': [d_enr.id]}, format='json')
        check(f'T9: {role} cannot be assigned to a department', r.status_code == 400,
              f'{r.status_code} {getattr(r, "data", "")}')
        acct.refresh_from_db()
        check(f'T9: {role} was left in no department',
              acct.departments.count() == 0, acct.departments.count())

    r = sc.patch(f'/api/v1/users/{newcomer.id}/',
                 {'departments': [d_enr.id]}, format='json')
    check('T9: a non-admin cannot change department membership',
          r.status_code != 200, r.status_code)
    check('T9: and the membership really did not change',
          newcomer.departments.count() == 0, newcomer.departments.count())

    # ── 10. Regression ────────────────────────────────────────────────────────
    # install_module_gate sets this on the APIView class itself, not on the
    # function it wraps (the function is replaced, so the flag lives on the class).
    check('T10: module gate still armed on APIView',
          getattr(APIView, '_knhs_module_gate_installed', False))
    check('T10: registry still has its 25 modules', len(MODULE_KEYS) == 25,
          len(MODULE_KEYS))
    # Authenticated staff still get a 200 somewhere, so the gate did not become
    # a blanket deny (the failure mode that would hide behind "tests are green").
    ok_probe = sc.get('/api/v1/subjects/')
    check('T10: an ordinary staff request still succeeds',
          ok_probe.status_code == 200, ok_probe.status_code)
    # Anonymous is still the auth layer's job, unchanged by this feature.
    check('T10: anonymous still blocked by the auth layer',
          APIClient().get('/api/v1/subjects/').status_code in (401, 403),
          APIClient().get('/api/v1/subjects/').status_code)

finally:
    User.objects.filter(username__startswith='s10_').delete()
    Department.objects.filter(code__startswith='S10').delete()

failed = [r for r in results if not r[1]]
for label, ok, detail in results:
    print(f"  {'PASS' if ok else 'FAIL'}  {label}" + (f'   [{detail}]' if detail else ''))
print(f'\n{len(results) - len(failed)}/{len(results)} PASS')
raise SystemExit(1 if failed else 0)
