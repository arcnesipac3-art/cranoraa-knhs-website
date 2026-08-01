# KNHS PRISM Portal — Load Testing

Locust-based load tests for the KNHS PRISM Portal backend.

## Prerequisites

```bash
pip install locust
```

## Quick Start

```bash
locust -f loadtest/locustfile.py --host=https://cranoraa-knhs-website-1.onrender.com
```

Then open **http://localhost:8089** in your browser to configure and launch the test.

## User Credentials (optional)

Set environment variables before running to enable authenticated user classes:

```bash
export LOADTEST_ADMIN_EMAIL="admin@example.com"
export LOADTEST_ADMIN_PASSWORD="password"

export LOADTEST_TEACHER_EMAIL="teacher@example.com"
export LOADTEST_TEACHER_PASSWORD="password"

export LOADTEST_STUDENT_EMAIL="student@example.com"
export LOADTEST_STUDENT_PASSWORD="password"
```

Anonymous (`PublicUser`) tests run without credentials.

## Recommended Settings

| Parameter      | Value          |
|----------------|----------------|
| Host           | `https://cranoraa-knhs-website-1.onrender.com` |
| Concurrent     | 500 – 1000     |
| Ramp-up        | 5 min          |
| Duration       | 10 – 30 min    |

## What Is Tested

| User Class    | Weight | Key Endpoints                                        |
|---------------|--------|------------------------------------------------------|
| AdminUser     | 2      | `/api/v1/admin/stats/`, `/api/v1/users/`, `/api/v1/classrooms/` |
| TeacherUser   | 5      | `/api/v1/teacher/stats/`, `/api/v1/grades/`, `/api/v1/schedules/` |
| StudentUser   | 10     | `/api/v1/student/dashboard/stats/`, `/api/v1/grades/`, `/api/v1/announcements/` |
| PublicUser    | 3      | `/api/health/`, `/api/v1/announcements/public/`, `/api/v1/system/maintenance-status/` |

## Monitoring

- **Web UI**: Response times, RPS, and failure rates at http://localhost:8089
- **CSV export**: Run with `--csv=loadtest/results` to get time-series CSVs
- **Headless mode**: `locust -f loadtest/locustfile.py --headless -u 500 -r 50 --run-time 5m --host=...`

## Headless CI example

```bash
locust -f loadtest/locustfile.py \
  --headless \
  -u 500 \
  -r 50 \
  --run-time 5m \
  --host=https://cranoraa-knhs-website-1.onrender.com \
  --csv=loadtest/results
```
