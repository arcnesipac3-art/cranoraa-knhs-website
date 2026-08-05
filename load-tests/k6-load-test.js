/**
 * K6 Load Testing Suite for KNHS School Portal
 * 
 * This script tests the concurrent user capacity of the school portal
 * by simulating realistic user journeys for different user types.
 * 
 * Run with:
 * k6 run k6-load-test.js
 * 
 * Or for specific scenarios:
 * k6 run --env SCENARIO=smoke k6-load-test.js
 * k6 run --env SCENARIO=load k6-load-test.js
 * k6 run --env SCENARIO=stress k6-load-test.js
 * k6 run --env SCENARIO=spike k6-load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// Custom metrics
const loginFailures = new Rate('login_failures');
const apiErrors = new Rate('api_errors');
const responseTime = new Trend('custom_response_time');
const successfulRequests = new Counter('successful_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5173';

// Test scenarios configuration
const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '1m',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },  // Ramp up to 10 users
      { duration: '5m', target: 10 },  // Stay at 10 users
      { duration: '2m', target: 50 },  // Ramp up to 50 users
      { duration: '5m', target: 50 },  // Stay at 50 users
      { duration: '2m', target: 100 }, // Ramp up to 100 users
      { duration: '5m', target: 100 }, // Stay at 100 users
      { duration: '3m', target: 0 },   // Ramp down
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 300 },
      { duration: '5m', target: 300 },
      { duration: '5m', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 10 },
      { duration: '10s', target: 200 },  // Sudden spike
      { duration: '3m', target: 200 },
      { duration: '10s', target: 10 },   // Sudden drop
      { duration: '2m', target: 10 },
      { duration: '30s', target: 0 },
    ],
  },
  soak: {
    executor: 'constant-vus',
    vus: 50,
    duration: '30m',  // Extended duration test
  },
};

// Select scenario based on environment variable
const selectedScenario = __ENV.SCENARIO || 'load';
export const options = {
  scenarios: {
    [selectedScenario]: scenarios[selectedScenario],
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'],     // Error rate should be below 5%
    login_failures: ['rate<0.1'],       // Login failures should be below 10%
    api_errors: ['rate<0.05'],          // API errors should be below 5%
  },
  noConnectionReuse: false,
  userAgent: 'K6LoadTest/1.0',
};

// Test data - In production, load from file or environment
const testUsers = {
  student: {
    username: 'test_student',
    password: 'TestPassword123!',
  },
  teacher: {
    username: 'test_teacher',
    password: 'TestPassword123!',
  },
  admin: {
    username: 'test_admin',
    password: 'TestPassword123!',
  },
};

// Headers setup
function getHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': FRONTEND_URL,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Authentication
function login(username, password) {
  const loginResponse = http.post(
    `${BASE_URL}/api/v1/login/`,
    JSON.stringify({
      username: username,
      password: password,
    }),
    {
      headers: getHeaders(),
    }
  );

  const success = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login returns access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  loginFailures.add(!success);
  
  if (success) {
    const body = JSON.parse(loginResponse.body);
    return {
      accessToken: body.access,
      refreshToken: body.refresh,
    };
  }
  
  return null;
}

// Public endpoints test
function testPublicEndpoints() {
  group('Public Endpoints', () => {
    // Health check
    const healthCheck = http.get(`${BASE_URL}/api/health/`, {
      headers: getHeaders(),
    });
    check(healthCheck, {
      'health check status is 200': (r) => r.status === 200,
    });
    responseTime.add(healthCheck.timings.duration);

    // Public announcements
    const announcements = http.get(`${BASE_URL}/api/v1/announcements/public/`, {
      headers: getHeaders(),
    });
    check(announcements, {
      'public announcements status is 200': (r) => r.status === 200,
    });
    responseTime.add(announcements.timings.duration);

    // Maintenance status
    const maintenanceStatus = http.get(`${BASE_URL}/api/v1/system/maintenance-status/`, {
      headers: getHeaders(),
    });
    check(maintenanceStatus, {
      'maintenance status is 200': (r) => r.status === 200,
    });
    responseTime.add(maintenanceStatus.timings.duration);

    sleep(1);
  });
}

// Student user journey
function studentJourney() {
  group('Student Journey', () => {
    // Login
    const tokens = login(testUsers.student.username, testUsers.student.password);
    if (!tokens) {
      console.log('Student login failed');
      return;
    }

    sleep(1);

    // Get profile
    const profile = http.get(`${BASE_URL}/api/v1/student/profile/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const profileSuccess = check(profile, {
      'student profile status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!profileSuccess);
    if (profileSuccess) successfulRequests.add(1);
    responseTime.add(profile.timings.duration);

    sleep(1);

    // Get dashboard stats
    const dashboardStats = http.get(`${BASE_URL}/api/v1/student/dashboard/stats/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const statsSuccess = check(dashboardStats, {
      'student dashboard stats status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!statsSuccess);
    if (statsSuccess) successfulRequests.add(1);
    responseTime.add(dashboardStats.timings.duration);

    sleep(1);

    // Get announcements
    const announcements = http.get(`${BASE_URL}/api/v1/announcements/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const announcementsSuccess = check(announcements, {
      'announcements status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!announcementsSuccess);
    if (announcementsSuccess) successfulRequests.add(1);
    responseTime.add(announcements.timings.duration);

    sleep(1);

    // Get assignments
    const assignments = http.get(`${BASE_URL}/api/v1/assignments/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const assignmentsSuccess = check(assignments, {
      'assignments status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!assignmentsSuccess);
    if (assignmentsSuccess) successfulRequests.add(1);
    responseTime.add(assignments.timings.duration);

    sleep(1);

    // Get calendar
    const calendar = http.get(`${BASE_URL}/api/v1/student/calendar/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const calendarSuccess = check(calendar, {
      'student calendar status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!calendarSuccess);
    if (calendarSuccess) successfulRequests.add(1);
    responseTime.add(calendar.timings.duration);

    sleep(2);

    // Get notifications
    const notifications = http.get(`${BASE_URL}/api/v1/notifications/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const notificationsSuccess = check(notifications, {
      'notifications status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!notificationsSuccess);
    if (notificationsSuccess) successfulRequests.add(1);
    responseTime.add(notifications.timings.duration);

    sleep(1);

    // Logout
    const logout = http.post(`${BASE_URL}/api/v1/logout/`, null, {
      headers: getHeaders(tokens.accessToken),
    });
    check(logout, {
      'logout status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    });

    sleep(1);
  });
}

// Teacher user journey
function teacherJourney() {
  group('Teacher Journey', () => {
    // Login
    const tokens = login(testUsers.teacher.username, testUsers.teacher.password);
    if (!tokens) {
      console.log('Teacher login failed');
      return;
    }

    sleep(1);

    // Get profile
    const profile = http.get(`${BASE_URL}/api/v1/profile/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const profileSuccess = check(profile, {
      'teacher profile status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!profileSuccess);
    if (profileSuccess) successfulRequests.add(1);
    responseTime.add(profile.timings.duration);

    sleep(1);

    // Get teacher stats
    const stats = http.get(`${BASE_URL}/api/v1/teacher/stats/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const statsSuccess = check(stats, {
      'teacher stats status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!statsSuccess);
    if (statsSuccess) successfulRequests.add(1);
    responseTime.add(stats.timings.duration);

    sleep(1);

    // Get classrooms
    const classrooms = http.get(`${BASE_URL}/api/v1/classrooms/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const classroomsSuccess = check(classrooms, {
      'classrooms status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!classroomsSuccess);
    if (classroomsSuccess) successfulRequests.add(1);
    responseTime.add(classrooms.timings.duration);

    sleep(1);

    // Get attendance
    const attendance = http.get(`${BASE_URL}/api/v1/attendance/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const attendanceSuccess = check(attendance, {
      'attendance status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!attendanceSuccess);
    if (attendanceSuccess) successfulRequests.add(1);
    responseTime.add(attendance.timings.duration);

    sleep(1);

    // Get assignments
    const assignments = http.get(`${BASE_URL}/api/v1/assignments/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const assignmentsSuccess = check(assignments, {
      'teacher assignments status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!assignmentsSuccess);
    if (assignmentsSuccess) successfulRequests.add(1);
    responseTime.add(assignments.timings.duration);

    sleep(2);

    // Get materials
    const materials = http.get(`${BASE_URL}/api/v1/materials/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const materialsSuccess = check(materials, {
      'materials status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!materialsSuccess);
    if (materialsSuccess) successfulRequests.add(1);
    responseTime.add(materials.timings.duration);

    sleep(1);

    // Logout
    const logout = http.post(`${BASE_URL}/api/v1/logout/`, null, {
      headers: getHeaders(tokens.accessToken),
    });
    check(logout, {
      'teacher logout status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    });

    sleep(1);
  });
}

// Admin user journey
function adminJourney() {
  group('Admin Journey', () => {
    // Login
    const tokens = login(testUsers.admin.username, testUsers.admin.password);
    if (!tokens) {
      console.log('Admin login failed');
      return;
    }

    sleep(1);

    // Get admin stats
    const stats = http.get(`${BASE_URL}/api/v1/admin/stats/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const statsSuccess = check(stats, {
      'admin stats status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!statsSuccess);
    if (statsSuccess) successfulRequests.add(1);
    responseTime.add(stats.timings.duration);

    sleep(1);

    // Get system metrics
    const metrics = http.get(`${BASE_URL}/api/v1/admin/system-metrics/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const metricsSuccess = check(metrics, {
      'system metrics status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!metricsSuccess);
    if (metricsSuccess) successfulRequests.add(1);
    responseTime.add(metrics.timings.duration);

    sleep(1);

    // Get users
    const users = http.get(`${BASE_URL}/api/v1/users/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const usersSuccess = check(users, {
      'users status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!usersSuccess);
    if (usersSuccess) successfulRequests.add(1);
    responseTime.add(users.timings.duration);

    sleep(2);

    // Get grade analytics
    const gradeAnalytics = http.get(`${BASE_URL}/api/v1/admin/grade-analytics/`, {
      headers: getHeaders(tokens.accessToken),
    });
    const gradeSuccess = check(gradeAnalytics, {
      'grade analytics status is 200': (r) => r.status === 200,
    });
    apiErrors.add(!gradeSuccess);
    if (gradeSuccess) successfulRequests.add(1);
    responseTime.add(gradeAnalytics.timings.duration);

    sleep(1);

    // Logout
    const logout = http.post(`${BASE_URL}/api/v1/logout/`, null, {
      headers: getHeaders(tokens.accessToken),
    });
    check(logout, {
      'admin logout status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    });

    sleep(1);
  });
}

// Main test function
export default function () {
  // Randomly select a user journey to simulate realistic load
  const rand = Math.random();
  
  if (rand < 0.1) {
    // 10% - Public browsing
    testPublicEndpoints();
  } else if (rand < 0.6) {
    // 50% - Students
    studentJourney();
  } else if (rand < 0.9) {
    // 30% - Teachers
    teacherJourney();
  } else {
    // 10% - Admins
    adminJourney();
  }
}

// Generate HTML report at the end
export function handleSummary(data) {
  return {
    "load-test-summary.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
