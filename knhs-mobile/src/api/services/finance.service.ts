import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, Fee, ScratchCard } from '@api/types';

export const financeService = {
  getFees: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Fee>> => {
    const response = await apiClient.get(API_ENDPOINTS.finance.fees, { params });
    return response.data;
  },

  getFee: async (id: number): Promise<Fee> => {
    const response = await apiClient.get(`${API_ENDPOINTS.finance.fees}${id}/`);
    return response.data;
  },

  createFee: async (data: Partial<Fee>): Promise<Fee> => {
    const response = await apiClient.post(API_ENDPOINTS.finance.fees, data);
    return response.data;
  },

  updateFee: async (id: number, data: Partial<Fee>): Promise<Fee> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.finance.fees}${id}/`, data);
    return response.data;
  },

  deleteFee: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.finance.fees}${id}/`);
  },

  getScratchCards: async (params?: Record<string, unknown>): Promise<PaginatedResponse<ScratchCard>> => {
    const response = await apiClient.get(API_ENDPOINTS.finance.scratchCards, { params });
    return response.data;
  },

  createScratchCard: async (data: Partial<ScratchCard>): Promise<ScratchCard> => {
    const response = await apiClient.post(API_ENDPOINTS.finance.scratchCards, data);
    return response.data;
  },

  useScratchCard: async (serialNumber: string): Promise<{ message: string; amount: number }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.finance.scratchCards}use/`, { serial_number: serialNumber });
    return response.data;
  },

  getPendingFees: async (params?: Record<string, unknown>): Promise<PaginatedResponse<{ student: { id: number; name: string }; total_fees: number; total_paid: number; balance: number }>> => {
    const response = await apiClient.get(API_ENDPOINTS.finance.pendingFees, { params });
    return response.data;
  },
};