import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, EnrollmentApplication, StudentClassEnrollment } from '@api/types';

export const enrollmentService = {
  getApplications: async (params?: Record<string, unknown>): Promise<PaginatedResponse<EnrollmentApplication>> => {
    const response = await apiClient.get(API_ENDPOINTS.enrollment.applications, { params });
    return response.data;
  },

  getApplication: async (id: number): Promise<EnrollmentApplication> => {
    const response = await apiClient.get(API_ENDPOINTS.enrollment.detail(id));
    return response.data;
  },

  createApplication: async (data: Partial<EnrollmentApplication>): Promise<EnrollmentApplication> => {
    const response = await apiClient.post(API_ENDPOINTS.enrollment.applications, data);
    return response.data;
  },

  updateApplication: async (id: number, data: Partial<EnrollmentApplication>): Promise<EnrollmentApplication> => {
    const response = await apiClient.patch(API_ENDPOINTS.enrollment.detail(id), data);
    return response.data;
  },

  approveApplication: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.enrollment.detail(id)}approve/`);
    return response.data;
  },

  rejectApplication: async (id: number, reason: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.enrollment.detail(id)}reject/`, { reason });
    return response.data;
  },

  getEnrollments: async (params?: Record<string, unknown>): Promise<PaginatedResponse<StudentClassEnrollment>> => {
    const response = await apiClient.get(API_ENDPOINTS.enrollment.classes, { params });
    return response.data;
  },

  createEnrollment: async (data: Partial<StudentClassEnrollment>): Promise<StudentClassEnrollment> => {
    const response = await apiClient.post(API_ENDPOINTS.enrollment.classes, data);
    return response.data;
  },

  updateEnrollment: async (id: number, data: Partial<StudentClassEnrollment>): Promise<StudentClassEnrollment> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.enrollment.classes}${id}/`, data);
    return response.data;
  },

  checkResult: async (enrollmentNumber: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.get(API_ENDPOINTS.enrollment.checkResult, { params: { enrollment_number: enrollmentNumber } });
    return response.data;
  },
};