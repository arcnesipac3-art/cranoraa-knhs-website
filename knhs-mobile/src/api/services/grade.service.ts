import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, Grade, GradeReport } from '@api/types';

export const gradeService = {
  getGrades: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Grade>> => {
    const response = await apiClient.get(API_ENDPOINTS.grades.grades, { params });
    return response.data;
  },

  getGrade: async (id: number): Promise<Grade> => {
    const response = await apiClient.get(`${API_ENDPOINTS.grades.grades}${id}/`);
    return response.data;
  },

  createGrade: async (data: Partial<Grade>): Promise<Grade> => {
    const response = await apiClient.post(API_ENDPOINTS.grades.grades, data);
    return response.data;
  },

  updateGrade: async (id: number, data: Partial<Grade>): Promise<Grade> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.grades.grades}${id}/`, data);
    return response.data;
  },

  deleteGrade: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.grades.grades}${id}/`);
  },

  getGradesSummary: async (params?: Record<string, unknown>): Promise<{ average: number; highest: number; lowest: number; passing_rate: number }> => {
    const response = await apiClient.get(API_ENDPOINTS.grades.summary, { params });
    return response.data;
  },

  getGradeReports: async (params?: Record<string, unknown>): Promise<PaginatedResponse<GradeReport>> => {
    const response = await apiClient.get(API_ENDPOINTS.grades.reports, { params });
    return response.data;
  },

  createGradeReport: async (data: Partial<GradeReport>): Promise<GradeReport> => {
    const response = await apiClient.post(API_ENDPOINTS.grades.reports, data);
    return response.data;
  },

  getGradeDistribution: async (params?: Record<string, unknown>): Promise<{ outstanding: number; very_satisfactory: number; satisfactory: number; fair: number; did_not_meet: number }> => {
    const response = await apiClient.get(API_ENDPOINTS.grades.distribution, { params });
    return response.data;
  },

  getGradeAnalytics: async (params?: Record<string, unknown>): Promise<{ trend: number[]; subjects: string[]; averages: number[] }> => {
    const response = await apiClient.get(API_ENDPOINTS.grades.analytics, { params });
    return response.data;
  },
};