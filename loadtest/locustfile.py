"""
Locust load test file for KNHS PRISM Portal.

Run with:
    locust -f loadtest/locustfile.py --host=https://cranoraa-knhs-website-1.onrender.com

Open http://localhost:8089 to configure and start the test.
"""
import os
import random
import string

from locust import HttpUser, task, between, events
from locust.exception import RespawnListener


ADMIN_EMAIL = os.getenv("LOADTEST_ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("LOADTEST_ADMIN_PASSWORD", "")
TEACHER_EMAIL = os.getenv("LOADTEST_TEACHER_EMAIL", "")
TEACHER_PASSWORD = os.getenv("LOADTEST_TEACHER_PASSWORD", "")
STUDENT_EMAIL = os.getenv("LOADTEST_STUDENT_EMAIL", "")
STUDENT_PASSWORD = os.getenv("LOADTEST_STUDENT_PASSWORD", "")


def _login(client, email, password):
    """Attempt login and return the access token, or None on failure."""
    try:
        resp = client.post(
            "/api/v1/login/",
            json={"email": email, "password": password},
            name="/api/v1/login/",
        )
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access") or data.get("token")
            if token:
                client.headers["Authorization"] = f"Bearer {token}"
            return data
    except Exception:
        pass
    return None


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"} if token else {}


# ---------------------------------------------------------------------------
# Admin User
# ---------------------------------------------------------------------------
class AdminUser(HttpUser):
    weight = 2
    wait_time = between(1, 5)

    def on_start(self):
        self.token = None
        if ADMIN_EMAIL and ADMIN_PASSWORD:
            result = _login(self.client, ADMIN_EMAIL, ADMIN_PASSWORD)
            if result:
                self.token = result.get("access") or result.get("token")

    @task(5)
    def browse_classrooms(self):
        self.client.get("/api/v1/classrooms/", name="/api/v1/classrooms/")

    @task(4)
    def browse_users(self):
        self.client.get("/api/v1/users/", name="/api/v1/users/")

    @task(3)
    def view_academic_years(self):
        self.client.get("/api/v1/schedules/", name="/api/v1/schedules/")

    @task(5)
    def access_dashboard_stats(self):
        self.client.get("/api/v1/admin/stats/", name="/api/v1/admin/stats/")

    @task(2)
    def view_system_metrics(self):
        self.client.get("/api/v1/admin/system-metrics/", name="/api/v1/admin/system-metrics/")

    @task(2)
    def view_grade_distribution(self):
        self.client.get("/api/v1/admin/grade-distribution/", name="/api/v1/admin/grade-distribution/")

    @task(1)
    def view_storage_analytics(self):
        self.client.get("/api/v1/admin/storage-analytics/", name="/api/v1/admin/storage-analytics/")

    @task(1)
    def view_maintenance_feed(self):
        self.client.get("/api/v1/admin/maintenance-feed/", name="/api/v1/admin/maintenance-feed/")

    @task(1)
    def view_attendance_analytics(self):
        self.client.get("/api/v1/admin/attendance-analytics/", name="/api/v1/admin/attendance-analytics/")

    @task(1)
    def view_grade_analytics(self):
        self.client.get("/api/v1/admin/grade-analytics/", name="/api/v1/admin/grade-analytics/")


# ---------------------------------------------------------------------------
# Teacher User
# ---------------------------------------------------------------------------
class TeacherUser(HttpUser):
    weight = 5
    wait_time = between(1, 5)

    def on_start(self):
        self.token = None
        if TEACHER_EMAIL and TEACHER_PASSWORD:
            result = _login(self.client, TEACHER_EMAIL, TEACHER_PASSWORD)
            if result:
                self.token = result.get("access") or result.get("token")

    @task(5)
    def browse_classrooms(self):
        self.client.get("/api/v1/classrooms/", name="/api/v1/classrooms/")

    @task(4)
    def view_schedules(self):
        self.client.get("/api/v1/schedules/", name="/api/v1/schedules/")

    @task(3)
    def access_grade_input(self):
        self.client.get("/api/v1/grades/", name="/api/v1/grades/")

    @task(3)
    def view_attendance(self):
        self.client.get("/api/v1/attendance/", name="/api/v1/attendance/")

    @task(5)
    def view_teacher_stats(self):
        self.client.get("/api/v1/teacher/stats/", name="/api/v1/teacher/stats/")

    @task(2)
    def view_subjects(self):
        self.client.get("/api/v1/subjects/", name="/api/v1/subjects/")

    @task(2)
    def view_classroom_subjects(self):
        self.client.get("/api/v1/classroom-subjects/", name="/api/v1/classroom-subjects/")

    @task(2)
    def view_assignments(self):
        self.client.get("/api/v1/assignments/", name="/api/v1/assignments/")

    @task(1)
    def view_learning_materials(self):
        self.client.get("/api/v1/materials/", name="/api/v1/materials/")

    @task(1)
    def view_enrollments(self):
        self.client.get("/api/v1/enrollments/", name="/api/v1/enrollments/")


# ---------------------------------------------------------------------------
# Student User
# ---------------------------------------------------------------------------
class StudentUser(HttpUser):
    weight = 10
    wait_time = between(1, 5)

    def on_start(self):
        self.token = None
        if STUDENT_EMAIL and STUDENT_PASSWORD:
            result = _login(self.client, STUDENT_EMAIL, STUDENT_PASSWORD)
            if result:
                self.token = result.get("access") or result.get("token")

    @task(5)
    def view_enrolled_classrooms(self):
        self.client.get("/api/v1/classrooms/", name="/api/v1/classrooms/")

    @task(5)
    def check_grades(self):
        self.client.get("/api/v1/grades/", name="/api/v1/grades/")

    @task(4)
    def view_announcements(self):
        self.client.get("/api/v1/announcements/", name="/api/v1/announcements/")

    @task(5)
    def view_student_dashboard(self):
        self.client.get("/api/v1/student/dashboard/stats/", name="/api/v1/student/dashboard/stats/")

    @task(3)
    def view_attendance(self):
        self.client.get("/api/v1/attendance/", name="/api/v1/attendance/")

    @task(2)
    def view_grade_summary(self):
        self.client.get("/api/v1/grades/summary/", name="/api/v1/grades/summary/")

    @task(2)
    def view_student_profile(self):
        self.client.get("/api/v1/student/profile/", name="/api/v1/student/profile/")

    @task(1)
    def view_student_calendar(self):
        self.client.get("/api/v1/student/calendar/", name="/api/v1/student/calendar/")

    @task(1)
    def view_notifications(self):
        self.client.get("/api/v1/notifications/polling/", name="/api/v1/notifications/polling/")

    @task(1)
    def view_assignments(self):
        self.client.get("/api/v1/assignments/", name="/api/v1/assignments/")


# ---------------------------------------------------------------------------
# Public / Anonymous User
# ---------------------------------------------------------------------------
class PublicUser(HttpUser):
    weight = 3
    wait_time = between(1, 5)
    host = os.getenv("LOCUST_HOST", "https://cranoraa-knhs-website-1.onrender.com")

    @task(5)
    def browse_public_announcements(self):
        self.client.get("/api/v1/announcements/public/", name="/api/v1/announcements/public/")

    @task(3)
    def access_maintenance_status(self):
        self.client.get("/api/v1/system/maintenance-status/", name="/api/v1/system/maintenance-status/")

    @task(5)
    def health_check(self):
        self.client.get("/api/health/", name="/api/health/")

    @task(2)
    def view_system_settings(self):
        self.client.get("/api/v1/system/settings/", name="/api/v1/system/settings/")

    @task(1)
    def hit_homepage(self):
        self.client.get("/", name="/")
