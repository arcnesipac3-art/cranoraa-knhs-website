import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, Schedule, Room, TimeSlot } from '@api/types';

export const scheduleService = {
  getSchedules: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Schedule>> => {
    const response = await apiClient.get(API_ENDPOINTS.schedule.schedules, { params });
    return response.data;
  },

  getSchedule: async (id: number): Promise<Schedule> => {
    const response = await apiClient.get(`${API_ENDPOINTS.schedule.schedules}${id}/`);
    return response.data;
  },

  createSchedule: async (data: Partial<Schedule>): Promise<Schedule> => {
    const response = await apiClient.post(API_ENDPOINTS.schedule.schedules, data);
    return response.data;
  },

  updateSchedule: async (id: number, data: Partial<Schedule>): Promise<Schedule> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.schedule.schedules}${id}/`, data);
    return response.data;
  },

  deleteSchedule: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.schedule.schedules}${id}/`);
  },

  getRooms: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Room>> => {
    const response = await apiClient.get(API_ENDPOINTS.schedule.rooms, { params });
    return response.data;
  },

  createRoom: async (data: Partial<Room>): Promise<Room> => {
    const response = await apiClient.post(API_ENDPOINTS.schedule.rooms, data);
    return response.data;
  },

  updateRoom: async (id: number, data: Partial<Room>): Promise<Room> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.schedule.rooms}${id}/`, data);
    return response.data;
  },

  deleteRoom: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.schedule.rooms}${id}/`);
  },

  getTimeSlots: async (params?: Record<string, unknown>): Promise<PaginatedResponse<TimeSlot>> => {
    const response = await apiClient.get(API_ENDPOINTS.schedule.timeSlots, { params });
    return response.data;
  },

  createTimeSlot: async (data: Partial<TimeSlot>): Promise<TimeSlot> => {
    const response = await apiClient.post(API_ENDPOINTS.schedule.timeSlots, data);
    return response.data;
  },

  updateTimeSlot: async (id: number, data: Partial<TimeSlot>): Promise<TimeSlot> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.schedule.timeSlots}${id}/`, data);
    return response.data;
  },

  deleteTimeSlot: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.schedule.timeSlots}${id}/`);
  },
};