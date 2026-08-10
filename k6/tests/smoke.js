/**
 * PRISM Smoke Test
 * Verifies all critical endpoints respond correctly with 1 user.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { config, login, apiGet, apiPost, think } from '../lib/helpers.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.15'],
    login_duration: ['p(95)<3000'],
    api_duration: ['p(95)<5000'],
  },
};

export default function () {
  // ── 1. Login (Admin) ──────────────────────────────────────────────────────
  const admin = login(config.admin.email, config.admin.pass, config.admin.role);
  if (!admin) return;

  // ── 2. Dashboard ──────────────────────────────────────────────────────────
  apiGet('/admin/stats/', admin.headers, { name: 'admin dashboard' });
  think(1, 2);

  // ── 3. Users list ─────────────────────────────────────────────────────────
  apiGet('/users/?role=staff', admin.headers, { name: 'list staff' });
  think(0.5, 1);

  apiGet('/users/?role=student', admin.headers, { name: 'list students' });
  think(0.5, 1);

  // ── 4. Classrooms ─────────────────────────────────────────────────────────
  apiGet('/classrooms/', admin.headers, { name: 'list classrooms' });
  think(0.5, 1);

  // ── 5. Subjects ───────────────────────────────────────────────────────────
  apiGet('/subjects/', admin.headers, { name: 'list subjects' });
  think(0.5, 1);

  // ── 6. Announcements ──────────────────────────────────────────────────────
  apiGet('/announcements/', admin.headers, { name: 'list announcements' });
  think(0.5, 1);

  // ── 7. Notifications ──────────────────────────────────────────────────────
  apiGet('/notifications/polling/', admin.headers, { name: 'notifications' });
  think(0.5, 1);

  // ── 8. Chat rooms ─────────────────────────────────────────────────────────
  apiGet('/chat/rooms/', admin.headers, { name: 'list chat rooms' });
  think(0.5, 1);

  // ── 9. Grading periods ────────────────────────────────────────────────────
  apiGet('/grading-periods/', admin.headers, { name: 'list grading periods' });
  think(0.5, 1);

  // ── 10. System settings ───────────────────────────────────────────────────
  apiGet('/system/settings/', admin.headers, { name: 'system settings' });
  think(0.5, 1);

  // ── 11. Enrollment applications ───────────────────────────────────────────
  apiGet('/enrollment-applications/', admin.headers, { name: 'list enrollments' });
  think(0.5, 1);

  // ── 12. Attendance history (as staff) ─────────────────────────────────────
  const staff = login(config.staff.email, config.staff.pass, config.staff.role);
  if (staff) {
    apiGet('/attendance/student-history/?month=2026-08', staff.headers, { name: 'staff attendance' });
    think(0.5, 1);

    // ── 13. Grades ───────────────────────────────────────────────────────────
    apiGet('/grades/', staff.headers, { name: 'list grades' });
    think(0.5, 1);
  }

  // ── 14. Student portal ────────────────────────────────────────────────────
  const student = login(config.student.email, config.student.pass, config.student.role);
  if (student) {
    apiGet('/student/dashboard/stats/', student.headers, { name: 'student dashboard' });
    think(0.5, 1);

    apiGet('/attendance/student-history/?month=2026-08', student.headers, { name: 'student attendance' });
    think(0.5, 1);

    apiGet('/grades/', student.headers, { name: 'student grades' });
    think(0.5, 1);
  }

  // ── 15. Health check ──────────────────────────────────────────────────────
  const healthRes = http.get(`${config.baseUrl}/api/health/`);
  check(healthRes, { 'health: status 200': (r) => r.status === 200 });

  sleep(1);
}
