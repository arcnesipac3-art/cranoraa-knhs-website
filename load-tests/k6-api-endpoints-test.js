/**
 * K6 API Endpoints Test
 * 
 * Tests individual API endpoints to identify bottlenecks.
 * This helps pinpoint which specific endpoints need optimization.
 * 
 * Usage:
 * k6 run k6-api-endpoints-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics per endpoint
const endpointMetrics = {};

function getOrCreateMetric(name) {
  if (!endpointMetrics[name]) {
    endpointMetrics[name] = new Trend(name);
  }
  return endpointMetrics[name];
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
  },
};

// Test user credentials
const testUser = {
  username: 'test_teacher',
  password: 'TestPassword123!',
  role: 'teacher',
};

function login() {
  const response = http.post(
    `${BASE_URL}/api/v1/login/`,
    JSON.stringify({
      username: testUser.username,
      password: testUser.password,
      role: testUser.role,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 200) {
    const body = JSON.parse(response.body);
    return body.access;
  }
  return null;
}

function testEndpoint(name, url, token) {
  const response = http.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const metricName = `endpoint_${name.replace(/[^a-zA-Z0-9]/g, '_')}_duration`;
  getOrCreateMetric(metricName).add(response.timings.duration);

  check(response, {
    [`${name} status is 200`]: (r) => r.status === 200,
    [`${name} response time < 2s`]: (r) => r.timings.duration < 2000,
  });

  return response;
}

export default function () {
  const token = login();
  if (!token) {
    console.error('Login failed');
    return;
  }

  sleep(1);

  group('Core API Endpoints', () => {
    // Profile endpoints
    testEndpoint('User Profile', `${BASE_URL}/api/v1/profile/`, token);
    sleep(0.5);

    // Dashboard endpoints
    testEndpoint('Teacher Stats', `${BASE_URL}/api/v1/teacher/stats/`, token);
    sleep(0.5);

    // Classroom management
    testEndpoint('Classrooms List', `${BASE_URL}/api/v1/classrooms/`, token);
    sleep(0.5);

    testEndpoint('Enrollments List', `${BASE_URL}/api/v1/enrollments/`, token);
    sleep(0.5);

    // Content endpoints
    testEndpoint('Announcements', `${BASE_URL}/api/v1/announcements/`, token);
    sleep(0.5);

    testEndpoint('Assignments', `${BASE_URL}/api/v1/assignments/`, token);
    sleep(0.5);

    testEndpoint('Materials', `${BASE_URL}/api/v1/materials/`, token);
    sleep(0.5);

    // Attendance and grades
    testEndpoint('Attendance', `${BASE_URL}/api/v1/attendance/`, token);
    sleep(0.5);

    testEndpoint('Grades', `${BASE_URL}/api/v1/grades/`, token);
    sleep(0.5);

    // Notifications
    testEndpoint('Notifications', `${BASE_URL}/api/v1/notifications/`, token);
    sleep(0.5);

    // Subjects
    testEndpoint('Subjects', `${BASE_URL}/api/v1/subjects/`, token);
    sleep(0.5);

    // Schedules
    testEndpoint('Schedules', `${BASE_URL}/api/v1/schedules/`, token);
    sleep(0.5);
  });

  sleep(2);
}

export function handleSummary(data) {
  console.log('\n=== Endpoint Performance Summary ===\n');
  
  const endpointData = [];
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (name.startsWith('endpoint_') && name.endsWith('_duration')) {
      const endpointName = name
        .replace('endpoint_', '')
        .replace('_duration', '')
        .replace(/_/g, ' ');
      
      endpointData.push({
        name: endpointName,
        avg: metric.values.avg.toFixed(2),
        p95: metric.values['p(95)'].toFixed(2),
        max: metric.values.max.toFixed(2),
      });
    }
  }

  // Sort by p95 descending (slowest first)
  endpointData.sort((a, b) => parseFloat(b.p95) - parseFloat(a.p95));

  console.log('Slowest Endpoints (by p95):');
  console.log('─'.repeat(80));
  console.log(`${'Endpoint'.padEnd(30)} | ${'Avg (ms)'.padEnd(10)} | ${'p95 (ms)'.padEnd(10)} | ${'Max (ms)'.padEnd(10)}`);
  console.log('─'.repeat(80));
  
  endpointData.forEach(ep => {
    console.log(`${ep.name.padEnd(30)} | ${ep.avg.padEnd(10)} | ${ep.p95.padEnd(10)} | ${ep.max.padEnd(10)}`);
  });
  console.log('─'.repeat(80));

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
