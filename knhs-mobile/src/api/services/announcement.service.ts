import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, Announcement, AnnouncementComment } from '@api/types';

export const announcementService = {
  getAnnouncements: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Announcement>> => {
    const response = await apiClient.get(API_ENDPOINTS.announcements.list, { params });
    return response.data;
  },

  getAnnouncement: async (id: number): Promise<Announcement> => {
    const response = await apiClient.get(`${API_ENDPOINTS.announcements.list}${id}/`);
    return response.data;
  },

  createAnnouncement: async (data: Partial<Announcement>): Promise<Announcement> => {
    const response = await apiClient.post(API_ENDPOINTS.announcements.list, data);
    return response.data;
  },

  updateAnnouncement: async (id: number, data: Partial<Announcement>): Promise<Announcement> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.announcements.list}${id}/`, data);
    return response.data;
  },

  deleteAnnouncement: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.announcements.list}${id}/`);
  },

  publishAnnouncement: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.announcements.list}${id}publish/`);
    return response.data;
  },

  expireAnnouncement: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.announcements.list}${id}expire/`);
    return response.data;
  },

  markAsRead: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.announcements.list}${id}read/`);
    return response.data;
  },

  getPublicAnnouncements: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Announcement>> => {
    const response = await apiClient.get(API_ENDPOINTS.announcements.public, { params });
    return response.data;
  },

  addComment: async (announcementId: number, content: string): Promise<AnnouncementComment> => {
    const response = await apiClient.post(`${API_ENDPOINTS.announcements.list}${announcementId}comments/`, { content });
    return response.data;
  },

  deleteComment: async (announcementId: number, commentId: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.announcements.list}${announcementId}comments/${commentId}/`);
  },
};