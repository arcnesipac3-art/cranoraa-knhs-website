import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, Ticket, TicketMessage } from '@api/types';

export const ticketService = {
  getTickets: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Ticket>> => {
    const response = await apiClient.get(API_ENDPOINTS.tickets.list, { params });
    return response.data;
  },

  getTicket: async (id: number): Promise<Ticket> => {
    const response = await apiClient.get(API_ENDPOINTS.tickets.detail(id));
    return response.data;
  },

  createTicket: async (data: Partial<Ticket>): Promise<Ticket> => {
    const response = await apiClient.post(API_ENDPOINTS.tickets.list, data);
    return response.data;
  },

  updateTicket: async (id: number, data: Partial<Ticket>): Promise<Ticket> => {
    const response = await apiClient.patch(API_ENDPOINTS.tickets.detail(id), data);
    return response.data;
  },

  deleteTicket: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.tickets.detail(id));
  },

  assignTicket: async (id: number, userId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.tickets.detail(id)}assign/`, { user_id: userId });
    return response.data;
  },

  resolveTicket: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.tickets.detail(id)}resolve/`);
    return response.data;
  },

  closeTicket: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.tickets.detail(id)}close/`);
    return response.data;
  },

  addParticipant: async (ticketId: number, userId: number, role: 'viewer' | 'collaborator'): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.tickets.detail(ticketId)}participants/`, { user_id: userId, role });
    return response.data;
  },

  removeParticipant: async (ticketId: number, userId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`${API_ENDPOINTS.tickets.detail(ticketId)}participants/${userId}/`);
    return response.data;
  },

  getTicketMessages: async (ticketId: number, params?: Record<string, unknown>): Promise<PaginatedResponse<TicketMessage>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.tickets.detail(ticketId)}messages/`, { params });
    return response.data;
  },

  addTicketMessage: async (ticketId: number, content: string, attachments?: File[]): Promise<TicketMessage> => {
    const formData = new FormData();
    formData.append('content', content);
    if (attachments) {
      attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }
    const response = await apiClient.post(`${API_ENDPOINTS.tickets.detail(ticketId)}messages/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getDepartments: async (): Promise<PaginatedResponse<{ id: number; name: string; code: string; contact_email: string; contact_phone: string }>> => {
    const response = await apiClient.get(API_ENDPOINTS.tickets.departments);
    return response.data;
  },
};