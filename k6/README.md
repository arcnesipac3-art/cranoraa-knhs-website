# PRISM Load Testing with k6

## Setup

1. Install k6: https://k6.io/docs/get-started/installation/
2. Copy `.env.example` to `.env` and fill in credentials
3. Run tests:

```bash
# Smoke test (1 user, 30s)
k6 run tests/smoke.js

# Load test (ramp to 50 users, 5min)
k6 run tests/load.js

# Stress test (ramp to 200 users, 10min)
k6 run tests/stress.js

# Full suite
k6 run tests/full.js
```

## Test Scenarios

| Test | VUs | Duration | Purpose |
|------|-----|----------|---------|
| Smoke | 1 | 30s | Verify endpoints work |
| Load | 1-50 | 5min | Normal school day load |
| Stress | 1-200 | 10min | Peak enrollment/grading |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BASE_URL` | API base URL (default: https://kiwalannhs.vercel.app) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASS` | Admin login password |
| `STAFF_EMAIL` | Staff/teacher login email |
| `STAFF_PASS` | Staff/teacher login password |
| `STUDENT_EMAIL` | Student login email |
| `STUDENT_PASS` | Student login password |
