import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://cranoraa-knhs-website-1.onrender.com';

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration', true);

const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || '';
const TEACHER_EMAIL = __ENV.TEACHER_EMAIL || '';
const TEACHER_PASSWORD = __ENV.TEACHER_PASSWORD || '';
const STUDENT_EMAIL = __ENV.STUDENT_EMAIL || '';
const STUDENT_PASSWORD = __ENV.STUDENT_PASSWORD || '';

export const options = {
  httpTimeout: '10s',
  stages: [
    { duration: '30s', target: 1 },
    { duration: '1m', target: 1 },
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 200 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    errors: ['rate<0.1'],
  },
};

// Cache tokens per VU so we don't re-login every iteration
const tokens = {};

function login(email, password) {
  const key = `${email}:${__VU}`;
  if (tokens[key]) return tokens[key];

  const res = http.post(
    `${BASE_URL}/api/v1/login/`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  );

  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
  });
  errorRate.add(!ok);
  if (!ok) return null;

  try {
    const data = res.json();
    const token = data.access || data.token;
    if (token) tokens[key] = token;
    return token;
  } catch {
    return null;
  }
}

function authGet(path, token, tag) {
  const res = http.get(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: tag || path },
  });
  apiDuration.add(res.timings.duration);
  const ok = check(res, {
    [`${tag || path} status 200`]: (r) => r.status === 200,
  });
  errorRate.add(!ok);
  return res;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  const rand = Math.random();
  let token;

  // 2% admin, 18% teacher, 50% student, 30% public
  if (rand < 0.02 && ADMIN_EMAIL) {
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!token) return;
    const tasks = [
      ['/api/v1/classrooms/', 'admin-classrooms'],
      ['/api/v1/users/', 'admin-users'],
      ['/api/v1/admin/stats/', 'admin-stats'],
      ['/api/v1/admin/system-metrics/', 'admin-metrics'],
    ];
    for (let i = 0; i < 5; i++) {
      const [path, tag] = pick(tasks);
      authGet(path, token, tag);
      sleep(Math.random() * 2 + 0.5);
    }
  } else if (rand < 0.20 && TEACHER_EMAIL) {
    token = login(TEACHER_EMAIL, TEACHER_PASSWORD);
    if (!token) return;
    const tasks = [
      ['/api/v1/classrooms/', 'teacher-classrooms'],
      ['/api/v1/schedules/', 'teacher-schedules'],
      ['/api/v1/grades/', 'teacher-grades'],
      ['/api/v1/attendance/', 'teacher-attendance'],
      ['/api/v1/teacher/stats/', 'teacher-stats'],
      ['/api/v1/classroom-subjects/', 'teacher-classroom-subjects'],
    ];
    for (let i = 0; i < 5; i++) {
      const [path, tag] = pick(tasks);
      authGet(path, token, tag);
      sleep(Math.random() * 2 + 0.5);
    }
  } else if (rand < 0.70 && STUDENT_EMAIL) {
    token = login(STUDENT_EMAIL, STUDENT_PASSWORD);
    if (!token) return;
    const tasks = [
      ['/api/v1/classrooms/', 'student-classrooms'],
      ['/api/v1/grades/', 'student-grades'],
      ['/api/v1/announcements/', 'student-announcements'],
      ['/api/v1/student/dashboard/stats/', 'student-dashboard'],
      ['/api/v1/attendance/', 'student-attendance'],
      ['/api/v1/assignments/', 'student-assignments'],
    ];
    for (let i = 0; i < 5; i++) {
      const [path, tag] = pick(tasks);
      authGet(path, token, tag);
      sleep(Math.random() * 2 + 0.5);
    }
  } else {
    // Public - no login
    const tasks = [
      ['/api/v1/announcements/public/', 'public-announcements'],
      ['/api/v1/system/maintenance-status/', 'public-maintenance'],
      ['/api/health/', 'public-health'],
      ['/api/v1/system/settings/', 'public-settings'],
      ['/', 'public-homepage'],
    ];
    for (let i = 0; i < 5; i++) {
      const [path, tag] = pick(tasks);
      const res = http.get(`${BASE_URL}${path}`, { tags: { name: tag } });
      apiDuration.add(res.timings.duration);
      const ok = check(res, { [`${tag} status 200`]: (r) => r.status === 200 });
      errorRate.add(!ok);
      sleep(Math.random() * 2 + 0.5);
    }
  }
}
