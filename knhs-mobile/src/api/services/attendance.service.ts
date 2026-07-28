import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, Attendance, AbsenceExcuse } from '@api/types';

export const attendanceService = {
  getAttendance: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Attendance>> => {
    const response = await apiClient.get(API_ENDPOINTS.attendance.attendance, { params });
    return response.data;
  },

  getAttendanceRecord: async (id: number): Promise<Attendance> => {
    const response = await apiClient.get(`${API_ENDPOINTS.attendance.attendance}${id}/`);
    return response.data;
  },

  markAttendance: async (data: Partial<Attendance>): Promise<Attendance> => {
    const response = await apiClient.post(API_ENDPOINTS.attendance.attendance, data);
    return response.data;
  },

  updateAttendance: async (id: number, data: Partial<Attendance>): Promise<Attendance> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.attendance.attendance}${id}/`, data);
    return response.data;
  },

  deleteAttendance: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.attendance.attendance}${id}/`);
  },

  getAttendanceSummary: async (params?: Record<string, unknown>): Promise<{ present: number; absent: number; late: number; excused: number; rate: number }> => {
    const response = await apiClient.get(API_ENDPOINTS.attendance.summary, { params });
    return response.data;
  },

  getAttendanceAnalytics: async (params?: Record<string, unknown>): Promise<{ daily: number[]; weekly: number[]; monthly: number[]; dates: string[] }> => {
    const response = await apiClient.get(API_ENDPOINTS.attendance.analytics, { params });
    return response.data;
  },

  getAbsenceExcuses: async (params?: Record<string, unknown>): Promise<PaginatedResponse<AbsenceExcuse>> => {
    const response = await apiClient.get(API_ENDPOINTS.attendance.excuses, { params });
    return response.data;
  },

  createAbsenceExcuse: async (data: Partial<AbsenceExcuse>): Promise<AbsenceExcuse> => {
    const response = await apiClient.post(API_ENDPOINTS.attendance.excuses, data);
    return response.data;
  },

  updateAbsenceExcuse: async (id: number, data: Partial<AbsenceExcuse>): Promise<AbsenceExcuse> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.attendance.excuses}${id}/`, data);
    return response.data;
  },

  approveAbsenceExcuse: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.attendance.excuses}${id}approve/`);
    return response.data;
  },

  rejectAbsenceExcuse: async (id: number, reason: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.attendance.excuses}${id}reject/`, { reason });
    return response.data;
  },
};