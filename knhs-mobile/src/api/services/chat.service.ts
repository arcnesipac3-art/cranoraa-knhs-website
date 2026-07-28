import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, ChatRoom, ChatMessage } from '@api/types';

export const chatService = {
  getRooms: async (params?: Record<string, unknown>): Promise<PaginatedResponse<ChatRoom>> => {
    const response = await apiClient.get(API_ENDPOINTS.chat.rooms, { params });
    return response.data;
  },

  getRoom: async (id: number): Promise<ChatRoom> => {
    const response = await apiClient.get(`${API_ENDPOINTS.chat.rooms}${id}/`);
    return response.data;
  },

  createRoom: async (data: Partial<ChatRoom>): Promise<ChatRoom> => {
    const response = await apiClient.post(API_ENDPOINTS.chat.rooms, data);
    return response.data;
  },

  updateRoom: async (id: number, data: Partial<ChatRoom>): Promise<ChatRoom> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.chat.rooms}${id}/`, data);
    return response.data;
  },

  deleteRoom: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.chat.rooms}${id}/`);
  },

  getMessages: async (roomId: number, params?: Record<string, unknown>): Promise<PaginatedResponse<ChatMessage>> => {
    const response = await apiClient.get(API_ENDPOINTS.chat.messages, { params: { ...params, room: roomId } });
    return response.data;
  },

  getMessage: async (id: number): Promise<ChatMessage> => {
    const response = await apiClient.get(`${API_ENDPOINTS.chat.messages}${id}/`);
    return response.data;
  },

  sendMessage: async (data: Partial<ChatMessage>): Promise<ChatMessage> => {
    const response = await apiClient.post(API_ENDPOINTS.chat.messages, data);
    return response.data;
  },

  updateMessage: async (id: number, data: Partial<ChatMessage>): Promise<ChatMessage> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.chat.messages}${id}/`, data);
    return response.data;
  },

  deleteMessage: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.chat.messages}${id}/`);
  },

  reportMessage: async (messageId: number, reason: string): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.chat.reports, { message: messageId, reason });
    return response.data;
  },
};