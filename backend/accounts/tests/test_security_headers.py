"""
Tests for security-related behavior: auth endpoints, unauthorized access, rate limiting, CORS.
"""
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class LoginEndpointExistsTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_login_accepts_post(self):
        response = self.client.post('/api/v1/login/', {
            'email': 'nonexistent',
            'password': 'test',
        })
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_login_rejects_get(self):
        response = self.client.get('/api/v1/login/')
        self.assertIn(response.status_code, [
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_login_rejects_put(self):
        response = self.client.put('/api/v1/login/', {})
        self.assertIn(response.status_code, [
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_403_FORBIDDEN,
        ])


class UnauthorizedAccessTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_protected_endpoint_returns_401(self):
        response = self.client.get('/api/v1/users/')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_protected_endpoint_rejects_invalid_token(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalidtoken123')
        response = self.client.get('/api/v1/users/')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_protected_endpoint_rejects_empty_auth_header(self):
        self.client.credentials(HTTP_AUTHORIZATION='')
        response = self.client.get('/api/v1/users/')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_profile_requires_auth(self):
        response = self.client.get('/api/v1/profile/')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])


class RateLimitingHeadersTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_login_has_throttle_class(self):
        from accounts.views.auth import login_view
        throttle_classes = getattr(login_view, 'throttle_classes', [])
        self.assertTrue(len(throttle_classes) > 0, 'login_view should have throttle classes')


class CORSTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_endpoint_accessible(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cors_middleware_configured(self):
        from django.conf import settings
        middleware = getattr(settings, 'MIDDLEWARE', [])
        cors_middlewares = [m for m in middleware if 'cors' in m.lower()]
        self.assertTrue(len(cors_middlewares) > 0, 'CORS middleware should be in settings')
