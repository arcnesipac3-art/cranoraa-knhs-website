"""
Tests for the health check endpoint.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class HealthCheckEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_returns_200(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_health_returns_healthy_status(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.data['status'], 'healthy')

    def test_health_returns_database_ok(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.data['database'], 'ok')

    def test_health_response_is_valid_json(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response['Content-Type'], 'application/json')

    def test_health_returns_version_key(self):
        response = self.client.get('/api/health/')
        self.assertIn('version', response.data)
        self.assertIsInstance(response.data['version'], str)
        self.assertTrue(len(response.data['version']) > 0)

    def test_health_works_without_authentication(self):
        self.client.credentials()
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_health_does_not_accept_post(self):
        response = self.client.post('/api/health/')
        self.assertIn(response.status_code, [
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_403_FORBIDDEN,
        ])
