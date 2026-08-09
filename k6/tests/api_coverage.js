/**
 * PRISM API Endpoint Coverage Test
 * Tests every major API endpoint and records response codes, times, and errors.
 */
import { check, sleep } from 'k6';
import { config, login, apiGet, apiPost, think, totalRequests, apiDuration, errorRate } from '../lib/helpers.js';

export const options = {
  vus: 5,
  duration: '3m',
  thresholds: {
    http_req_failed: ['rate<0.2'],
    errors: ['rate<0.2'],
    api_duration: ['p(95)<10000'],
  },
};

// ── Endpoint definitions ──────────────────────────────────────────────────────
const ENDPOINTS = {
  admin: [
    { method: 'GET', path: '/admin/stats/', name: 'Admin Dashboard Stats' },
    { method: 'GET', path: '/admin/audit-logs/', name: 'Audit Logs' },
    { method: 'GET', path: '/admin/grade-distribution/', name: 'Grade Distribution' },
    { method: 'GET', path: '/admin/storage-analytics/', name: 'Storage Analytics' },
    { method: 'GET', path: '/admin/system-metrics/', name: 'System Metrics' },
    { method: 'GET', path: '/admin/maintenance-feed/', name: 'Maintenance Feed' },
    { method: 'GET', path: '/system/settings/', name: 'System Settings' },
    { method: 'GET', path: '/system/maintenance-status/', name: 'Maintenance Status' },
  ],
  users: [
    { method: 'GET', path: '/users/?role=admin', name: 'List Admins' },
    { method: 'GET', path: '/users/?role=staff', name: 'List Staff' },
    { method: 'GET', path: '/users/?role=student', name: 'List Students' },
    { method: 'GET', path: '/users/?role=parent', name: 'List Parents' },
    { method: 'GET', path: '/users/?search=test', name: 'Search Users' },
    { method: 'GET', path: '/profile/', name: 'User Profile' },
  ],
  academics: [
    { method: 'GET', path: '/classrooms/', name: 'List Classrooms' },
    { method: 'GET', path: '/subjects/', name: 'List Subjects' },
    { method: 'GET', path: '/classroom-subjects/', name: 'List Classroom Subjects' },
    { method: 'GET', path: '/schedules/', name: 'List Schedules' },
    { method: 'GET', path: '/rooms/', name: 'List Rooms' },
    { method: 'GET', path: '/admin/academic-years/', name: 'Academic Years' },
    { method: 'GET', path: '/grading-periods/', name: 'Grading Periods' },
    { method: 'GET', path: '/grading-periods/active/', name: 'Active Grading Periods' },
  ],
  grading: [
    { method: 'GET', path: '/grades/', name: 'List Grades' },
    { method: 'GET', path: '/grade-submissions/', name: 'Grade Submissions' },
    { method: 'GET', path: '/grade-reports/', name: 'Grade Reports' },
  ],
  attendance: [
    { method: 'GET', path: '/attendance/?month=2026-08', name: 'List Attendance' },
    { method: 'GET', path: '/attendance/student-history/?month=2026-08', name: 'Student History' },
    { method: 'GET', path: '/attendance/admin-monitoring/', name: 'Admin Monitoring' },
    { method: 'GET', path: '/absence-excuses/', name: 'List Excuses' },
  ],
  communication: [
    { method: 'GET', path: '/announcements/', name: 'List Announcements' },
    { method: 'GET', path: '/announcements/public/', name: 'Public Announcements' },
    { method: 'GET', path: '/notifications/polling/', name: 'Notifications Polling' },
    { method: 'GET', path: '/chat/rooms/', name: 'Chat Rooms' },
  ],
  enrollment: [
    { method: 'GET', path: '/enrollment-applications/', name: 'Enrollment Applications' },
    { method: 'GET', path: '/enrollments/', name: 'Enrollments' },
  ],
  compliance: [
    { method: 'GET', path: '/compliance/types/', name: 'Compliance Types' },
    { method: 'GET', path: '/compliance/submissions/', name: 'Compliance Submissions' },
  ],
  records: [
    { method: 'GET', path: '/record-requests/', name: 'Record Requests' },
    { method: 'GET', path: '/transcripts/', name: 'Transcripts' },
    { method: 'GET', path: '/transfer-certificates/', name: 'Transfer Certificates' },
    { method: 'GET', path: '/character-certificates/', name: 'Character Certificates' },
  ],
  student_portal: [
    { method: 'GET', path: '/student/dashboard/stats/', name: 'Student Dashboard' },
    { method: 'GET', path: '/student/profile/', name: 'Student Profile' },
    { method: 'GET', path: '/student/calendar/', name: 'Student Calendar' },
    { method: 'GET', path: '/materials/', name: 'Learning Materials' },
    { method: 'GET', path: '/assignments/', name: 'Assignments' },
    { method: 'GET', path: '/my-compliance/', name: 'My Compliance' },
  ],
  teacher_portal: [
    { method: 'GET', path: '/teacher/stats/', name: 'Teacher Dashboard' },
    { method: 'GET', path: '/lesson-plans/', name: 'Lesson Plans' },
    { method: 'GET', path: '/quiz-banks/', name: 'Quiz Banks' },
  ],
  school_forms: [
    { method: 'GET', path: '/sf1/', name: 'SF1 School Register' },
    { method: 'GET', path: '/sf2/', name: 'SF2 Attendance Report' },
    { method: 'GET', path: '/sf5/', name: 'SF5 Promotion Report' },
    { method: 'GET', path: '/sf9/', name: 'SF9 Report Card' },
    { method: 'GET', path: '/sf10/', name: 'SF10 Permanent Record' },
  ],
};

// ── Results tracking ──────────────────────────────────────────────────────────
const results = {};

function recordResult(name, status, duration, error) {
  if (!results[name]) {
    results[name] = { calls: 0, errors: 0, totalTime: 0, minTime: Infinity, maxTime: 0 };
  }
  const r = results[name];
  r.calls++;
  if (error) r.errors++;
  r.totalTime += duration;
  r.minTime = Math.min(r.minTime, duration);
  r.maxTime = Math.max(r.maxTime, duration);
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function () {
  // Pick a random category and endpoint
  const categories = Object.keys(ENDPOINTS);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const endpoints = ENDPOINTS[category];
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  // Pick a token based on category
  let token;
  if (['admin', 'users', 'academics', 'compliance', 'records', 'school_forms'].includes(category)) {
    token = login(config.admin.email, config.admin.pass);
  } else if (['teacher_portal', 'grading', 'attendance'].includes(category)) {
    token = login(config.staff.email, config.staff.pass);
  } else {
    token = login(config.student.email, config.student.pass);
  }

  if (!token) return;

  const res = apiGet(endpoint.path, token.headers, { scenario: 'coverage' });
  const error = res.status !== 200;
  recordResult(`${category} > ${endpoint.name}`, res.status, res.timings.duration, error);

  check(res, {
    [`${endpoint.name}: status 200`]: (r) => r.status === 200,
    [`${endpoint.name}: has body`]: (r) => r.body && r.body.length > 0,
  });

  think(0.3, 1);
}

export function handleSummary(data) {
  console.log('\n─── PRISM API Coverage Report ─────────────────────────');
  console.log(`  ${'Endpoint'.padEnd(45)} ${'Calls'.padStart(6)} ${'Errors'.padStart(7)} ${'Avg ms'.padStart(8)} ${'P95 ms'.padStart(8)}`);
  console.log('  ' + '─'.repeat(78));

  for (const [name, stats] of Object.entries(results).sort((a, b) => a[0].localeCompare(b[0]))) {
    const avg = stats.calls > 0 ? (stats.totalTime / stats.calls).toFixed(0) : '0';
    const errPct = stats.calls > 0 ? ((stats.errors / stats.calls) * 100).toFixed(1) : '0.0';
    console.log(`  ${name.padEnd(45)} ${String(stats.calls).padStart(6)} ${(errPct + '%').padStart(7)} ${(avg + 'ms').padStart(8)} ${(stats.maxTime.toFixed(0) + 'ms').padStart(8)}`);
  }

  const totalCalls = Object.values(results).reduce((s, r) => s + r.calls, 0);
  const totalErrors = Object.values(results).reduce((s, r) => s + r.errors, 0);
  console.log('  ' + '─'.repeat(78));
  console.log(`  ${'TOTAL'.padEnd(45)} ${String(totalCalls).padStart(6)} ${String(totalErrors).padStart(7)}`);
  console.log('───────────────────────────────────────────────────────\n');

  return {
    'k6/results/coverage-summary.json': JSON.stringify({ metrics: data.metrics, endpoints: results }, null, 2),
    stdout: '',
  };
}
