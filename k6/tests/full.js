/**
 * PRISM Full Test Suite
 * Runs smoke, load, and API coverage in sequence.
 */
import { check, sleep } from 'k6';
import { config, login, apiGet, apiPost, think, totalRequests, errorRate, apiDuration } from '../lib/helpers.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '20s',
      startTime: '0s',
      exec: 'smokeRun',
    },
    load_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m',  target: 20 },
        { duration: '30s', target: 0 },
      ],
      startTime: '25s',
      exec: 'loadRun',
    },
    api_coverage: {
      executor: 'constant-vus',
      vus: 3,
      duration: '1m',
      startTime: '2m',
      exec: 'apiRun',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.15'],
    errors: ['rate<0.2'],
  },
};

// ── Sessions ──────────────────────────────────────────────────────────────────
let admin, staff, student;

function initSessions() {
  admin = login(config.admin.email, config.admin.pass);
  staff = login(config.staff.email, config.staff.pass);
  student = login(config.student.email, config.student.pass);
}

// ── Smoke scenario ────────────────────────────────────────────────────────────
export function smokeRun() {
  if (!admin) initSessions();

  // Login
  const s = login(config.admin.email, config.admin.pass);
  check(s, { 'smoke: login ok': (r) => !!r });
  think(0.5, 1);

  // Core endpoints
  if (s) {
    apiGet('/admin/stats/', s.headers);
    apiGet('/users/?role=staff', s.headers);
    apiGet('/classrooms/', s.headers);
    apiGet('/subjects/', s.headers);
    apiGet('/announcements/', s.headers);
    think(0.5, 1);
  }

  sleep(1);
}

// ── Load scenario ─────────────────────────────────────────────────────────────
export function loadRun() {
  if (!admin) initSessions();

  const scenarios = [
    () => admin && apiGet('/admin/stats/', admin.headers),
    () => admin && apiGet('/users/?role=staff', admin.headers),
    () => admin && apiGet('/classrooms/', admin.headers),
    () => admin && apiGet('/announcements/', admin.headers),
    () => staff && apiGet('/teacher/stats/', staff.headers),
    () => staff && apiGet('/grades/', staff.headers),
    () => staff && apiGet('/attendance/student-history/?month=2026-08', staff.headers),
    () => student && apiGet('/student/dashboard/stats/', student.headers),
    () => student && apiGet('/grades/', student.headers),
    () => student && apiGet('/attendance/student-history/?month=2026-08', student.headers),
  ];

  const fn = scenarios[Math.floor(Math.random() * scenarios.length)];
  fn();
  think(0.5, 1.5);
}

// ── API coverage scenario ─────────────────────────────────────────────────────
export function apiRun() {
  if (!admin) initSessions();

  const endpoints = [
    '/admin/stats/',
    '/admin/audit-logs/',
    '/admin/grade-distribution/',
    '/admin/storage-analytics/',
    '/users/?role=staff',
    '/users/?role=student',
    '/users/?role=parent',
    '/classrooms/',
    '/subjects/',
    '/announcements/',
    '/announcements/public/',
    '/notifications/polling/',
    '/chat/rooms/',
    '/grading-periods/',
    '/grading-periods/active/',
    '/enrollment-applications/',
    '/system/settings/',
    '/materials/',
    '/assignments/',
    '/absence-excuses/',
    '/compliance/types/',
    '/grade-submissions/',
    '/student/dashboard/stats/',
    '/student/profile/',
    '/teacher/stats/',
    '/grades/',
    '/attendance/student-history/?month=2026-08',
    '/record-requests/',
  ];

  const token = admin?.headers || staff?.headers || student?.headers;
  if (!token) return;

  const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
  apiGet(ep, token, { scenario: 'coverage' });
  think(0.3, 0.8);
}

// ── Default (fallback) ────────────────────────────────────────────────────────
export default function () {
  smokeRun();
}

export function handleSummary(data) {
  const errRate = data.metrics.errors?.values?.rate || 0;
  const p95 = data.metrics.api_duration?.values?.['p(95)'] || 0;
  const reqs = data.metrics.total_requests?.values?.count || 0;

  console.log('\n─── PRISM Full Suite Summary ──────────────────────────');
  console.log(`  Total requests: ${reqs}`);
  console.log(`  Error rate:     ${(errRate * 100).toFixed(2)}%`);
  console.log(`  API p95:        ${p95.toFixed(0)}ms`);
  console.log('───────────────────────────────────────────────────────\n');

  return {
    'k6/results/full-summary.json': JSON.stringify(data, null, 2),
    stdout: '',
  };
}
