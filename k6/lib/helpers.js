import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
export const errorRate = new Rate('errors');
export const loginDuration = new Trend('login_duration', true);
export const apiDuration = new Trend('api_duration', true);
export const totalRequests = new Counter('total_requests');

// ── Environment config ────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'https://kiwalannhs.vercel.app';

export const config = {
  baseUrl: BASE_URL,
  admin: { email: __ENV.ADMIN_EMAIL || '', pass: __ENV.ADMIN_PASS || '' },
  staff: { email: __ENV.STAFF_EMAIL || '', pass: __ENV.STAFF_PASS || '' },
  student: { email: __ENV.STUDENT_EMAIL || '', pass: __ENV.STUDENT_PASS || '' },
};

// ── Shared headers ────────────────────────────────────────────────────────────
const JSON_HEADER = { 'Content-Type': 'application/json' };

// ── Auth helper ───────────────────────────────────────────────────────────────
export function login(email, password) {
  const res = http.post(
    `${config.baseUrl}/api/v1/login/`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADER, tags: { name: 'login' } }
  );

  const ok = check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: has access token': (r) => {
      try { return !!JSON.parse(r.body).access; } catch { return false; }
    },
  });

  errorRate.add(!ok);
  loginDuration.add(res.timings.duration);
  totalRequests.add(1);

  if (!ok) return null;

  const body = JSON.parse(res.body);
  return {
    token: body.access,
    user: body.user,
    headers: {
      Authorization: `Bearer ${body.access}`,
      ...JSON_HEADER,
    },
  };
}

// ── API request helper ────────────────────────────────────────────────────────
export function apiGet(path, headers, tags = {}) {
  const res = http.get(`${config.baseUrl}/api/v1${path}`, {
    headers,
    tags: { name: `GET ${path}`, ...tags },
  });
  const ok = check(res, { [`${path}: status 200`]: (r) => r.status === 200 });
  errorRate.add(!ok);
  apiDuration.add(res.timings.duration);
  totalRequests.add(1);
  return res;
}

export function apiPost(path, body, headers, tags = {}) {
  const res = http.post(`${config.baseUrl}/api/v1${path}`, JSON.stringify(body), {
    headers,
    tags: { name: `POST ${path}`, ...tags },
  });
  const ok = check(res, {
    [`${path}: status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!ok);
  apiDuration.add(res.timings.duration);
  totalRequests.add(1);
  return res;
}

// ── Random helper ─────────────────────────────────────────────────────────────
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Think time (simulates user reading/thinking) ──────────────────────────────
export function think(minSec = 1, maxSec = 3) {
  sleep(minSec + Math.random() * (maxSec - minSec));
}
