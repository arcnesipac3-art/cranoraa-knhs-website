/**
 * PRISM Stress Test
 * Pushes the system beyond normal capacity to find breaking points.
 * Ramps to 200 VUs over 10 minutes.
 */
import { check, sleep } from 'k6';
import { config, login, apiGet, apiPost, randomItem, think, totalRequests, errorRate } from '../lib/helpers.js';

export const options = {
  stages: [
    { duration: '1m',  target: 20 },   // warm up
    { duration: '2m',  target: 50 },   // normal load
    { duration: '2m',  target: 100 },  // high load
    { duration: '2m',  target: 150 },  // stress
    { duration: '1m',  target: 200 },  // peak stress
    { duration: '1m',  target: 100 },  // recovery
    { duration: '1m',  target: 0 },    // cool down
  ],
  thresholds: {
    http_req_failed: ['rate<0.25'],
    errors: ['rate<0.3'],
    login_duration: ['p(95)<8000'],
    api_duration: ['p(95)<15000'],
  },
};

// ── Session pools ─────────────────────────────────────────────────────────────
const sessions = { admin: null, staff: [], student: [] };

function initSessions() {
  sessions.admin = login(config.admin.email, config.admin.pass, config.admin.role);
  sessions.staff.push(login(config.staff.email, config.staff.pass, config.staff.role));
  sessions.student.push(login(config.student.email, config.student.pass, config.student.role));
}

// ── Heavy admin operations ────────────────────────────────────────────────────
function adminStress() {
  if (!sessions.admin) return;
  const h = sessions.admin.headers;

  // Concurrent dashboard data
  apiGet('/admin/stats/', h, { scenario: 'stress' });
  apiGet('/admin/audit-logs/', h, { scenario: 'stress' });
  think(0.2, 0.5);

  // Large user lists
  apiGet('/users/?role=staff&page_size=100', h, { scenario: 'stress' });
  apiGet('/users/?role=student&page_size=100', h, { scenario: 'stress' });
  think(0.2, 0.5);

  // Enrollment batch
  apiGet('/enrollment-applications/', h, { scenario: 'stress' });
  think(0.2, 0.5);

  // Classrooms + subjects
  apiGet('/classrooms/', h, { scenario: 'stress' });
  apiGet('/subjects/', h, { scenario: 'stress' });
  think(0.2, 0.5);

  // Grading periods
  apiGet('/grading-periods/', h, { scenario: 'stress' });
  apiGet('/grading-periods/active/', h, { scenario: 'stress' });
  think(0.2, 0.5);
}

// ── Heavy teacher operations ──────────────────────────────────────────────────
function staffStress() {
  if (sessions.staff.length === 0) return;
  const h = sessions.staff[0].headers;

  apiGet('/teacher/stats/', h, { scenario: 'stress' });
  think(0.2, 0.5);

  apiGet('/classrooms/', h, { scenario: 'stress' });
  apiGet('/grades/', h, { scenario: 'stress' });
  think(0.2, 0.5);

  apiGet('/attendance/student-history/?month=2026-08', h, { scenario: 'stress' });
  apiGet('/materials/', h, { scenario: 'stress' });
  think(0.2, 0.5);

  apiGet('/absence-excuses/', h, { scenario: 'stress' });
  apiGet('/announcements/', h, { scenario: 'stress' });
  think(0.2, 0.5);

  // Grade submissions
  apiGet('/grade-submissions/', h, { scenario: 'stress' });
  think(0.2, 0.5);
}

// ── Heavy student operations ──────────────────────────────────────────────────
function studentStress() {
  if (sessions.student.length === 0) return;
  const h = sessions.student[0].headers;

  apiGet('/student/dashboard/stats/', h, { scenario: 'stress' });
  think(0.2, 0.5);

  apiGet('/grades/', h, { scenario: 'stress' });
  apiGet('/attendance/student-history/?month=2026-08', h, { scenario: 'stress' });
  think(0.2, 0.5);

  apiGet('/materials/', h, { scenario: 'stress' });
  apiGet('/assignments/', h, { scenario: 'stress' });
  think(0.2, 0.5);

  apiGet('/chat/rooms/', h, { scenario: 'stress' });
  apiGet('/notifications/polling/', h, { scenario: 'stress' });
  think(0.2, 0.5);

  apiGet('/announcements/public/', h, { scenario: 'stress' });
  apiGet('/absence-excuses/', h, { scenario: 'stress' });
  think(0.2, 0.5);
}

// ── Chat flood ────────────────────────────────────────────────────────────────
function chatStress() {
  if (!sessions.admin) return;
  const h = sessions.admin.headers;

  const roomsRes = apiGet('/chat/rooms/', h, { scenario: 'stress' });
  think(0.1, 0.3);

  try {
    const rooms = JSON.parse(roomsRes.body);
    const roomList = rooms.results || rooms;
    if (roomList.length > 0) {
      const room = randomItem(roomList);
      apiGet(`/chat/messages/?room_id=${room.id}`, h, { scenario: 'stress' });
      think(0.1, 0.3);
    }
  } catch (e) {}
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function () {
  if (__VU === 1) initSessions();

  const roll = Math.random();
  if (roll < 0.15) adminStress();
  else if (roll < 0.50) staffStress();
  else if (roll < 0.85) studentStress();
  else chatStress();

  sleep(0.5 + Math.random() * 1);
}

export function handleSummary(data) {
  const errRate = data.metrics.errors?.values?.rate || 0;
  const p95 = data.metrics.api_duration?.values?.['p(95)'] || 0;
  const reqs = data.metrics.total_requests?.values?.count || 0;
  const httpFail = data.metrics.http_req_failed?.values?.rate || 0;

  console.log('\n─── PRISM Stress Test Summary ─────────────────────────');
  console.log(`  Total requests: ${reqs}`);
  console.log(`  Error rate:     ${(errRate * 100).toFixed(2)}%`);
  console.log(`  HTTP fail rate: ${(httpFail * 100).toFixed(2)}%`);
  console.log(`  API p95:        ${p95.toFixed(0)}ms`);
  console.log('───────────────────────────────────────────────────────\n');

  return {
    'k6/results/stress-summary.json': JSON.stringify(data, null, 2),
    stdout: '',
  };
}
