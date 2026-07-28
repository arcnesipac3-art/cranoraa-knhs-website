import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, Classroom, Subject, ClassroomSubject, AcademicYear, Semester, SystemSettings } from '@api/types';

export const academicService = {
  getClassrooms: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Classroom>> => {
    const response = await apiClient.get(API_ENDPOINTS.academic.classrooms, { params });
    return response.data;
  },

  getClassroom: async (id: number): Promise<Classroom> => {
    const response = await apiClient.get(`${API_ENDPOINTS.academic.classrooms}${id}/`);
    return response.data;
  },

  createClassroom: async (data: Partial<Classroom>): Promise<Classroom> => {
    const response = await apiClient.post(API_ENDPOINTS.academic.classrooms, data);
    return response.data;
  },

  updateClassroom: async (id: number, data: Partial<Classroom>): Promise<Classroom> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.academic.classrooms}${id}/`, data);
    return response.data;
  },

  deleteClassroom: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.academic.classrooms}${id}/`);
  },

  getSubjects: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Subject>> => {
    const response = await apiClient.get(API_ENDPOINTS.academic.subjects, { params });
    return response.data;
  },

  getSubject: async (id: number): Promise<Subject> => {
    const response = await apiClient.get(`${API_ENDPOINTS.academic.subjects}${id}/`);
    return response.data;
  },

  createSubject: async (data: Partial<Subject>): Promise<Subject> => {
    const response = await apiClient.post(API_ENDPOINTS.academic.subjects, data);
    return response.data;
  },

  updateSubject: async (id: number, data: Partial<Subject>): Promise<Subject> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.academic.subjects}${id}/`, data);
    return response.data;
  },

  deleteSubject: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.academic.subjects}${id}/`);
  },

  getClassroomSubjects: async (params?: Record<string, unknown>): Promise<PaginatedResponse<ClassroomSubject>> => {
    const response = await apiClient.get(API_ENDPOINTS.academic.classroomSubjects, { params });
    return response.data;
  },

  createClassroomSubject: async (data: Partial<ClassroomSubject>): Promise<ClassroomSubject> => {
    const response = await apiClient.post(API_ENDPOINTS.academic.classroomSubjects, data);
    return response.data;
  },

  updateClassroomSubject: async (id: number, data: Partial<ClassroomSubject>): Promise<ClassroomSubject> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.academic.classroomSubjects}${id}/`, data);
    return response.data;
  },

  deleteClassroomSubject: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.academic.classroomSubjects}${id}/`);
  },

  getAcademicYears: async (): Promise<PaginatedResponse<AcademicYear>> => {
    const response = await apiClient.get(API_ENDPOINTS.academic.academicYears);
    return response.data;
  },

  createAcademicYear: async (data: Partial<AcademicYear>): Promise<AcademicYear> => {
    const response = await apiClient.post(API_ENDPOINTS.academic.academicYears, data);
    return response.data;
  },

  updateAcademicYear: async (id: number, data: Partial<AcademicYear>): Promise<AcademicYear> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.academic.academicYears}${id}/`, data);
    return response.data;
  },

  getSemesters: async (academicYearId?: number): Promise<PaginatedResponse<Semester>> => {
    const params = academicYearId ? { academic_year: academicYearId } : {};
    const response = await apiClient.get(API_ENDPOINTS.academic.semesters, { params });
    return response.data;
  },

  createSemester: async (data: Partial<Semester>): Promise<Semester> => {
    const response = await apiClient.post(API_ENDPOINTS.academic.semesters, data);
    return response.data;
  },

  updateSemester: async (id: number, data: Partial<Semester>): Promise<Semester> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.academic.semesters}${id}/`, data);
    return response.data;
  },

  getSystemSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get(API_ENDPOINTS.academic.settings);
    return response.data;
  },

  updateSystemSettings: async (data: Partial<SystemSettings>): Promise<SystemSettings> => {
    const response = await apiClient.patch(API_ENDPOINTS.academic.settings, data);
    return response.data;
  },
};