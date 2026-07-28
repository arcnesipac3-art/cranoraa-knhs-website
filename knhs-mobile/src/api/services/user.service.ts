import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, User, UserProfile } from '@api/types';

export const userService = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get(API_ENDPOINTS.users.list, { params });
    return response.data;
  },

  getById: async (id: number): Promise<User> => {
    const response = await apiClient.get(API_ENDPOINTS.users.detail(id));
    return response.data;
  },

  create: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.post(API_ENDPOINTS.users.create, data);
    return response.data;
  },

  update: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch(API_ENDPOINTS.users.detail(id), data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.users.detail(id));
  },

  updateProfile: async (id: number, data: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await apiClient.patch(`/users/${id}/profile/`, data);
    return response.data;
  },
};