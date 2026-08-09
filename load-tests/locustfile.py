"""
KNHS PRISM Portal - Research Grade Load Test

A/B testing approach: Each phase tests a different load condition.
Collects all metrics needed for a research paper.

Install:  pip install locust
Run:      locust -f load-tests/locustfile.py --host https://cranoraa-knhs-website-1.onrender.com

Required environment variables (set before running):
    LOADTEST_ADMIN_USERNAME    — username of a real admin account
    LOADTEST_ADMIN_PASSWORD    — password of that admin account
    LOADTEST_TEACHER_USERNAME  — username of a real teacher account
    LOADTEST_TEACHER_PASSWORD  — password of that teacher account
    LOADTEST_STUDENT_USERNAME  — username of a real student account
    LOADTEST_STUDENT_PASSWORD  — password of that student account

Example (PowerShell):
    $env:LOADTEST_ADMIN_USERNAME="admin_user"
    $env:LOADTEST_ADMIN_PASSWORD="YourRealPassword"
    locust -f load-tests/locustfile.py --host https://cranoraa-knhs-website-1.onrender.com

Test Phases:
  Phase 1 - Baseline:     5 users,  2 min  (server warm-up)
  Phase 2 - Normal Load:  20 users, 5 min  (typical school day)
  Phase 3 - Peak Load:    50 users, 5 min  (busy period)
  Phase 4 - Stress Test:  100 users, 5 min (find the breaking point)
"""

import os
import random
import time
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner


# ---------------------------------------------------------------------------
# Credentials — MUST be set via environment variables.
# Never hardcode real credentials here.
# ---------------------------------------------------------------------------
_CREDS = {
    "admin": {
        "username": os.environ.get("LOADTEST_ADMIN_USERNAME", ""),
        "password": os.environ.get("LOADTEST_ADMIN_PASSWORD", ""),
        "role": "admin",
    },
    "teacher": {
        "username": os.environ.get("LOADTEST_TEACHER_USERNAME", ""),
        "password": os.environ.get("LOADTEST_TEACHER_PASSWORD", ""),
        "role": "staff",
    },
    "student": {
        "username": os.environ.get("LOADTEST_STUDENT_USERNAME", ""),
        "password": os.environ.get("LOADTEST_STUDENT_PASSWORD", ""),
        "role": "student",
    },
}

# Validate that credentials are set before the test starts
_MISSING = [f"LOADTEST_{r.upper()}_USERNAME / LOADTEST_{r.upper()}_PASSWORD"
            for r, c in _CREDS.items() if not c["username"] or not c["password"]]


@events.init.add_listener
def on_locust_init(environment, **kwargs):
    if _MISSING:
        print("\n" + "=" * 70)
        print("ERROR: Missing load test credentials. Set these env vars:")
        for m in _MISSING:
            print(f"  {m}")
        print("=" * 70 + "\n")


def _login(client, username, password):
    """
    Attempt login with the given credentials.
    Returns the access token string on success, or None on failure.
    The login endpoint accepts 'username' or 'email' as the identifier field.
    """
    if not username or not password:
        return None

    resp = client.post(
        "/api/v1/login/",
        json={"username": username, "password": password},
        name="/api/v1/login/",
        # Mark failed logins as non-failures in Locust so they don't
        # pollute the error table — we handle them explicitly below.
        catch_response=True,
    )
    with resp:
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access") or data.get("token")
            resp.success()
            return token
        elif resp.status_code == 429:
            resp.failure(f"Rate limited (429) for user '{username}' — reduce concurrency or increase AXES_FAILURE_LIMIT")
            return None
        elif resp.status_code == 401:
            resp.failure(f"Invalid credentials for '{username}' — check LOADTEST_*_USERNAME/PASSWORD env vars")
            return None
        else:
            resp.failure(f"Login failed {resp.status_code}: {resp.text[:200]}")
            return None


class PortalUser(HttpUser):
    """
    Simulates a real user of the KNHS PRISM Portal.
    Each virtual user is randomly assigned a role (student/teacher/admin)
    and performs realistic API calls for that role.
    """
    wait_time = between(1, 3)

    def on_start(self):
        self.role = random.choice(["student", "teacher", "admin"])
        creds = _CREDS[self.role]
        self.token = _login(self.client, creds["username"], creds["password"])

        if self.token:
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            # Login failed — skip all tasks for this virtual user
            self.role = None

    # ══════════════════════════════════════════════════════════════════════
    # STUDENT TASKS
    # ══════════════════════════════════════════════════════════════════════

    @task(5)
    def student_dashboard(self):
        if self.role != "student" or not self.token:
            return
        self.client.get("/api/v1/student/dashboard/stats/",
                        name="/api/v1/student/dashboard/stats/")

    @task(4)
    def student_grades(self):
        if self.role != "student" or not self.token:
            return
        self.client.get("/api/v1/grades/", name="/api/v1/grades/")

    @task(4)
    def student_attendance(self):
        if self.role != "student" or not self.token:
            return
        self.client.get("/api/v1/attendance/student-history/?month=2026-08",
                        name="/api/v1/attendance/student-history/")

    @task(3)
    def student_materials(self):
        if self.role != "student" or not self.token:
            return
        self.client.get("/api/v1/materials/", name="/api/v1/materials/")

    @task(3)
    def student_assignments(self):
        if self.role != "student" or not self.token:
            return
        self.client.get("/api/v1/assignments/", name="/api/v1/assignments/")

    @task(2)
    def student_chat(self):
        if self.role != "student" or not self.token:
            return
        self.client.get("/api/v1/chat/rooms/", name="/api/v1/chat/rooms/")

    @task(2)
    def student_notifications(self):
        if self.role != "student" or not self.token:
            return
        self.client.get("/api/v1/notifications/polling/",
                        name="/api/v1/notifications/polling/")

    @task(1)
    def student_announcements(self):
        if self.role != "student" or not self.token:
            return
        self.client.get("/api/v1/announcements/public/",
                        name="/api/v1/announcements/public/")

    # ══════════════════════════════════════════════════════════════════════
    # TEACHER TASKS
    # ══════════════════════════════════════════════════════════════════════

    @task(5)
    def teacher_stats(self):
        if self.role != "teacher" or not self.token:
            return
        self.client.get("/api/v1/teacher/stats/", name="/api/v1/teacher/stats/")

    @task(4)
    def teacher_classrooms(self):
        if self.role != "teacher" or not self.token:
            return
        self.client.get("/api/v1/classrooms/", name="/api/v1/classrooms/")

    @task(4)
    def teacher_grades(self):
        if self.role != "teacher" or not self.token:
            return
        self.client.get("/api/v1/grades/", name="/api/v1/grades/")

    @task(3)
    def teacher_attendance(self):
        if self.role != "teacher" or not self.token:
            return
        self.client.get("/api/v1/attendance/teacher-dashboard/",
                        name="/api/v1/attendance/teacher-dashboard/")

    @task(3)
    def teacher_materials(self):
        if self.role != "teacher" or not self.token:
            return
        self.client.get("/api/v1/materials/", name="/api/v1/materials/")

    @task(2)
    def teacher_announcements(self):
        if self.role != "teacher" or not self.token:
            return
        self.client.get("/api/v1/announcements/", name="/api/v1/announcements/")

    @task(2)
    def teacher_notifications(self):
        if self.role != "teacher" or not self.token:
            return
        self.client.get("/api/v1/notifications/polling/",
                        name="/api/v1/notifications/polling/")

    @task(1)
    def teacher_schedule(self):
        if self.role != "teacher" or not self.token:
            return
        self.client.get("/api/v1/schedules/", name="/api/v1/schedules/")

    # ══════════════════════════════════════════════════════════════════════
    # ADMIN TASKS
    # ══════════════════════════════════════════════════════════════════════

    @task(5)
    def admin_stats(self):
        if self.role != "admin" or not self.token:
            return
        self.client.get("/api/v1/admin/stats/", name="/api/v1/admin/stats/")

    @task(4)
    def admin_users(self):
        if self.role != "admin" or not self.token:
            return
        self.client.get("/api/v1/users/?role=staff&page_size=50",
                        name="/api/v1/users/")

    @task(3)
    def admin_enrollments(self):
        if self.role != "admin" or not self.token:
            return
        self.client.get("/api/v1/enrollment-applications/",
                        name="/api/v1/enrollment-applications/")

    @task(3)
    def admin_classrooms(self):
        if self.role != "admin" or not self.token:
            return
        self.client.get("/api/v1/classrooms/", name="/api/v1/classrooms/")

    @task(2)
    def admin_audit_logs(self):
        if self.role != "admin" or not self.token:
            return
        self.client.get("/api/v1/admin/audit-logs/", name="/api/v1/admin/audit-logs/")

    @task(2)
    def admin_grading_periods(self):
        if self.role != "admin" or not self.token:
            return
        self.client.get("/api/v1/grading-periods/", name="/api/v1/grading-periods/")

    @task(1)
    def admin_announcements(self):
        if self.role != "admin" or not self.token:
            return
        self.client.get("/api/v1/announcements/", name="/api/v1/announcements/")

    # ══════════════════════════════════════════════════════════════════════
    # SHARED (all roles)
    # ══════════════════════════════════════════════════════════════════════

    @task(1)
    def health_check(self):
        self.client.get("/api/health/", name="/api/health/")
