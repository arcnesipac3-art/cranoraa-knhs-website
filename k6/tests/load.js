/**
 * PRISM Load Test
 * Simulates a normal school day: teachers grading, students checking, parents viewing.
 * Ramps from 1 to 50 VUs over 5 minutes.
 */
import { check, sleep } from 'k6';
import { config, login, apiGet, apiPost, randomItem, think, totalRequests, errorRate } from '../lib/helpers.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '1m',  target: 30 },   // normal load
    { duration: '2m',  target: 50 },   // peak load
    { duration: '30s', target: 20 },   // scale down
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],
    errors: ['rate<0.2'],
    login_duration: ['p(95)<5000'],
    api_duration: ['p(95)<8000'],
  },
};

// ── User pools (pre-authenticated per VU) ─────────────────────────────────────
let adminToken = null;
let staffTokens = [];
let studentTokens = [];

function setupTokens() {
  adminToken = login(config.admin.email, config.admin.pass, config.admin.role);
  staffTokens.push(login(config.staff.email, config.staff.pass, config.staff.role));
  studentTokens.push(login(config.student.email, config.student.pass, config.student.role));
}

// ── Scenario: Admin browsing ──────────────────────────────────────────────────
function adminScenario() {
  if (!adminToken) return;
  const h = adminToken.headers;

  apiGet('/admin/stats/', h, { scenario: 'admin' });
  think(1, 2);

  apiGet('/users/?role=staff&page_size=50', h, { scenario: 'admin' });
  think(0.5, 1);

  apiGet('/enrollment-applications/', h, { scenario: 'admin' });
  think(0.5, 1);

  apiGet('/classrooms/', h, { scenario: 'admin' });
  think(0.5, 1);

  apiGet('/announcements/', h, { scenario: 'admin' });
  think(1, 2);

  apiGet('/admin/audit-logs/', h, { scenario: 'admin' });
  think(0.5, 1);

  apiGet('/grading-periods/', h, { scenario: 'admin' });
  think(0.5, 1);
}

// ── Scenario: Teacher grading/attendance ───────────────────────────────────────
function staffScenario() {
  if (staffTokens.length === 0) return;
  const h = staffTokens[0].headers;

  // Dashboard
  apiGet('/teacher/stats/', h, { scenario: 'staff' });
  think(1, 2);

  // Classrooms
  const clsRes = apiGet('/classrooms/', h, { scenario: 'staff' });
  think(0.5, 1);

  // Grades
  apiGet('/grades/', h, { scenario: 'staff' });
  think(1, 2);

  // Attendance
  apiGet('/attendance/student-history/?month=2026-08', h, { scenario: 'staff' });
  think(0.5, 1);

  // Materials
  apiGet('/materials/', h, { scenario: 'staff' });
  think(0.5, 1);

  // Announcements
  apiGet('/announcements/', h, { scenario: 'staff' });
  think(0.5, 1);

  // Notifications
  apiGet('/notifications/polling/', h, { scenario: 'staff' });
  think(1, 2);

  // Absence excuses
  apiGet('/absence-excuses/', h, { scenario: 'staff' });
  think(0.5, 1);
}

// ── Scenario: Student portal ──────────────────────────────────────────────────
function studentScenario() {
  if (studentTokens.length === 0) return;
  const h = studentTokens[0].headers;

  // Dashboard
  apiGet('/student/dashboard/stats/', h, { scenario: 'student' });
  think(1, 2);

  // Grades
  apiGet('/grades/', h, { scenario: 'student' });
  think(1, 2);

  // Attendance
  apiGet('/attendance/student-history/?month=2026-08', h, { scenario: 'student' });
  think(0.5, 1);

  // Materials
  apiGet('/materials/', h, { scenario: 'student' });
  think(0.5, 1);

  // Assignments
  apiGet('/assignments/', h, { scenario: 'student' });
  think(0.5, 1);

  // Chat
  apiGet('/chat/rooms/', h, { scenario: 'student' });
  think(1, 2);

  // Notifications
  apiGet('/notifications/polling/', h, { scenario: 'student' });
  think(0.5, 1);

  // Public announcements
  apiGet('/announcements/public/', h, { scenario: 'student' });
  think(0.5, 1);
}

// ── Scenario: Chat messaging ──────────────────────────────────────────────────
function chatScenario() {
  if (!adminToken) return;
  const h = adminToken.headers;

  // List rooms
  const roomsRes = apiGet('/chat/rooms/', h, { scenario: 'chat' });
  think(0.3, 0.5);

  // Load messages for first room
  try {
    const rooms = JSON.parse(roomsRes.body);
    const roomList = rooms.results || rooms;
    if (roomList.length > 0) {
      const roomId = roomList[0].id;
      apiGet(`/chat/messages/?room_id=${roomId}`, h, { scenario: 'chat' });
      think(0.5, 1);
    }
  } catch (e) {}
}

// ── Main function ─────────────────────────────────────────────────────────────
export default function () {
  if (__VU === 1) setupTokens();

  const scenarios = [adminScenario, staffScenario, studentScenario, chatScenario];
  const weights = [0.15, 0.35, 0.40, 0.10];

  // Weighted random selection
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < scenarios.length; i++) {
    cumulative += weights[i];
    if (roll <= cumulative) {
      scenarios[i]();
      break;
    }
  }

  sleep(1);
}

export function handleSummary(data) {
  const errRate = data.metrics.errors?.values?.rate || 0;
  const p95 = data.metrics.api_duration?.values?.['p(95)'] || 0;
  const reqs = data.metrics.total_requests?.values?.count || 0;

  console.log('\n─── PRISM Load Test Summary ──────────────────────────');
  console.log(`  Total requests: ${reqs}`);
  console.log(`  Error rate:     ${(errRate * 100).toFixed(2)}%`);
  console.log(`  API p95:        ${p95.toFixed(0)}ms`);
  console.log(`  HTTP fail rate: ${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`);
  console.log('──────────────────────────────────────────────────────\n');

  return {
    'k6/results/load-summary.json': JSON.stringify(data, null, 2),
    stdout: '',
  };
}
