"""
PRISM School Management System - API Testing Suite
Tests backend API endpoints directly without UI

Installation:
pip install requests pytest pytest-html python-dotenv

Usage:
pytest tests/api_tests.py --html=api_test_report.html --self-contained-html
"""

import os
import requests
import pytest
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Configuration
API_BASE_URL = os.getenv("TEST_API_URL", "http://localhost:8000")
API_VERSION = "v1"

# Test Users
TEST_USERS = {
    "admin": {
        "email": os.getenv("TEST_ADMIN_EMAIL", "admin@knhs.edu.ph"),
        "password": os.getenv("TEST_ADMIN_PASSWORD", "Admin@123"),
        "role": "admin"
    },
    "teacher": {
        "email": os.getenv("TEST_TEACHER_EMAIL", "teacher@knhs.edu.ph"),
        "password": os.getenv("TEST_TEACHER_PASSWORD", "Teacher@123"),
        "role": "staff"
    },
    "student": {
        "email": os.getenv("TEST_STUDENT_EMAIL", "student@knhs.edu.ph"),
        "password": os.getenv("TEST_STUDENT_PASSWORD", "Student@123"),
        "role": "student"
    }
}


class APIClient:
    """Helper class for API requests"""
    
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
        self.session = requests.Session()
    
    def login(self, email, password, role=None):
        """Authenticate and get JWT token"""
        url = f"{self.base_url}/api/{API_VERSION}/login/"
        payload = {
            "email": email,
            "password": password
        }
        if role:
            payload["role"] = role
        
        response = self.session.post(url, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access") or data.get("access_token") or data.get("token")
            if self.token:
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return response
        return response
    
    def get(self, endpoint):
        """Make GET request"""
        url = f"{self.base_url}{endpoint}"
        return self.session.get(url)
    
    def post(self, endpoint, data):
        """Make POST request"""
        url = f"{self.base_url}{endpoint}"
        return self.session.post(url, json=data)
    
    def put(self, endpoint, data):
        """Make PUT request"""
        url = f"{self.base_url}{endpoint}"
        return self.session.put(url, json=data)
    
    def delete(self, endpoint):
        """Make DELETE request"""
        url = f"{self.base_url}{endpoint}"
        return self.session.delete(url)


@pytest.fixture(scope="function")
def api_client():
    """Create API client instance"""
    return APIClient(API_BASE_URL)


# ==================== AUTHENTICATION API TESTS ====================

class TestAuthenticationAPI:
    """API Tests for Authentication endpoints"""
    
    def test_API_AUTH_001_valid_admin_login(self, api_client):
        """API Test: Valid admin login returns token"""
        user = TEST_USERS["admin"]
        response = api_client.login(user["email"], user["password"], user["role"])
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "access" in data or "access_token" in data or "token" in data, "No token in response"
        assert api_client.token is not None, "Token not set in client"
        
        print(f"✓ Admin login successful. Token: {api_client.token[:20]}...")
    
    def test_API_AUTH_002_invalid_credentials(self, api_client):
        """API Test: Invalid credentials return 401"""
        response = api_client.login("user@knhs.edu.ph", "WrongPassword123")
        
        assert response.status_code in [400, 401, 403], f"Expected 401/400, got {response.status_code}"
        
        data = response.json()
        assert "access" not in data and "token" not in data, "Token should not be present for failed login"
        
        print(f"✓ Invalid credentials correctly rejected with status {response.status_code}")
    
    def test_API_AUTH_003_sql_injection_prevention(self, api_client):
        """API Test: SQL injection attempts are rejected"""
        sql_payloads = [
            "' OR '1'='1",
            "admin' --",
            "' UNION SELECT NULL--"
        ]
        
        for payload in sql_payloads:
            response = api_client.login(payload, payload)
            
            assert response.status_code in [400, 401, 403], f"SQL injection not prevented: {payload}"
            
            # Check that no database errors are exposed
            response_text = response.text.lower()
            assert "database" not in response_text, "Database error exposed"
            assert "sql" not in response_text, "SQL error exposed"
        
        print(f"✓ All {len(sql_payloads)} SQL injection attempts correctly rejected")
    
    def test_API_AUTH_004_protected_endpoint_without_token(self, api_client):
        """API Test: Protected endpoints require authentication"""
        # Try to access protected endpoint without login
        response = api_client.get(f"/api/{API_VERSION}/users/")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print(f"✓ Protected endpoint correctly requires authentication")
    
    def test_API_AUTH_005_protected_endpoint_with_token(self, api_client):
        """API Test: Protected endpoints accessible with valid token"""
        # Login first
        user = TEST_USERS["admin"]
        login_response = api_client.login(user["email"], user["password"], user["role"])
        assert login_response.status_code == 200, "Login failed"
        
        # Access protected endpoint
        response = api_client.get(f"/api/{API_VERSION}/users/")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print(f"✓ Protected endpoint accessible with valid token")


# ==================== USER API TESTS ====================

class TestUserAPI:
    """API Tests for User management endpoints"""
    
    def test_API_USER_001_list_users(self, api_client):
        """API Test: List users endpoint returns data"""
        # Login as admin
        user = TEST_USERS["admin"]
        api_client.login(user["email"], user["password"], user["role"])
        
        # Get users list
        response = api_client.get(f"/api/{API_VERSION}/users/")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list) or "results" in data, "Response should be list or paginated"
        
        print(f"✓ Users list retrieved successfully")
    
    def test_API_USER_002_filter_users_by_role(self, api_client):
        """API Test: Filter users by role"""
        # Login as admin
        user = TEST_USERS["admin"]
        api_client.login(user["email"], user["password"], user["role"])
        
        # Get staff users
        response = api_client.get(f"/api/{API_VERSION}/users/?role=staff")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print(f"✓ Users filtered by role successfully")


# ==================== CLASSROOM API TESTS ====================

class TestClassroomAPI:
    """API Tests for Classroom endpoints"""
    
    def test_API_CLASSROOM_001_list_classrooms(self, api_client):
        """API Test: List classrooms endpoint"""
        # Login as admin
        user = TEST_USERS["admin"]
        api_client.login(user["email"], user["password"], user["role"])
        
        # Get classrooms
        response = api_client.get(f"/api/{API_VERSION}/classrooms/")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list) or "results" in data, "Response should be list or paginated"
        
        print(f"✓ Classrooms list retrieved successfully")


# ==================== GRADE API TESTS ====================

class TestGradeAPI:
    """API Tests for Grade management endpoints"""
    
    def test_API_GRADE_001_student_can_view_own_grades(self, api_client):
        """API Test: Student can view their own grades"""
        # Login as student
        user = TEST_USERS["student"]
        response = api_client.login(user["email"], user["password"], user["role"])
        
        if response.status_code == 200:
            # Try to get grades
            grades_response = api_client.get(f"/api/{API_VERSION}/grades/")
            
            # Should either succeed or return 404 if no grades exist
            assert grades_response.status_code in [200, 404], f"Unexpected status: {grades_response.status_code}"
            
            print(f"✓ Student grade access working (status: {grades_response.status_code})")
        else:
            pytest.skip("Student login failed - check test credentials")


# ==================== ENROLLMENT API TESTS ====================

class TestEnrollmentAPI:
    """API Tests for Enrollment endpoints"""
    
    def test_API_ENROLLMENT_001_list_applications(self, api_client):
        """API Test: List enrollment applications"""
        # Login as admin
        user = TEST_USERS["admin"]
        api_client.login(user["email"], user["password"], user["role"])
        
        # Get enrollment applications
        response = api_client.get(f"/api/{API_VERSION}/enrollment-applications/")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print(f"✓ Enrollment applications list retrieved")


# ==================== HEALTH CHECK TESTS ====================

class TestHealthCheck:
    """API Tests for System health endpoints"""
    
    def test_API_HEALTH_001_api_is_reachable(self, api_client):
        """API Test: API server is reachable"""
        try:
            response = requests.get(f"{API_BASE_URL}/api/{API_VERSION}/", timeout=5)
            assert response.status_code in [200, 404, 403], f"API not reachable: {response.status_code}"
            print(f"✓ API server is reachable")
        except requests.exceptions.ConnectionError:
            pytest.fail("API server not reachable. Is the backend running?")


# ==================== RUN ALL TESTS ====================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--html=api_test_report.html", "--self-contained-html"])
