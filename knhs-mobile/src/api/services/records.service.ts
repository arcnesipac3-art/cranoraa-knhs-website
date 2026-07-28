import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { PaginatedResponse, Transcript, TransferCertificate, CharacterCertificate, AchievementRecord, RecordRequest } from '@api/types';

export const recordsService = {
  getTranscripts: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Transcript>> => {
    const response = await apiClient.get(API_ENDPOINTS.records.transcripts, { params });
    return response.data;
  },

  getTranscript: async (id: number): Promise<Transcript> => {
    const response = await apiClient.get(`${API_ENDPOINTS.records.transcripts}${id}/`);
    return response.data;
  },

  createTranscript: async (data: Partial<Transcript>): Promise<Transcript> => {
    const response = await apiClient.post(API_ENDPOINTS.records.transcripts, data);
    return response.data;
  },

  downloadTranscriptPdf: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`${API_ENDPOINTS.records.transcripts}${id}pdf/`, { responseType: 'blob' });
    return response.data;
  },

  getTransferCertificates: async (params?: Record<string, unknown>): Promise<PaginatedResponse<TransferCertificate>> => {
    const response = await apiClient.get(API_ENDPOINTS.records.transferCertificates, { params });
    return response.data;
  },

  createTransferCertificate: async (data: Partial<TransferCertificate>): Promise<TransferCertificate> => {
    const response = await apiClient.post(API_ENDPOINTS.records.transferCertificates, data);
    return response.data;
  },

  downloadTransferCertificatePdf: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`${API_ENDPOINTS.records.transferCertificates}${id}pdf/`, { responseType: 'blob' });
    return response.data;
  },

  getCharacterCertificates: async (params?: Record<string, unknown>): Promise<PaginatedResponse<CharacterCertificate>> => {
    const response = await apiClient.get(API_ENDPOINTS.records.characterCertificates, { params });
    return response.data;
  },

  createCharacterCertificate: async (data: Partial<CharacterCertificate>): Promise<CharacterCertificate> => {
    const response = await apiClient.post(API_ENDPOINTS.records.characterCertificates, data);
    return response.data;
  },

  downloadCharacterCertificatePdf: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`${API_ENDPOINTS.records.characterCertificates}${id}pdf/`, { responseType: 'blob' });
    return response.data;
  },

  getAchievements: async (params?: Record<string, unknown>): Promise<PaginatedResponse<AchievementRecord>> => {
    const response = await apiClient.get(API_ENDPOINTS.records.achievements, { params });
    return response.data;
  },

  createAchievement: async (data: Partial<AchievementRecord>): Promise<AchievementRecord> => {
    const response = await apiClient.post(API_ENDPOINTS.records.achievements, data);
    return response.data;
  },

  updateAchievement: async (id: number, data: Partial<AchievementRecord>): Promise<AchievementRecord> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.records.achievements}${id}/`, data);
    return response.data;
  },

  deleteAchievement: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.records.achievements}${id}/`);
  },

  getRecordRequests: async (params?: Record<string, unknown>): Promise<PaginatedResponse<RecordRequest>> => {
    const response = await apiClient.get(API_ENDPOINTS.records.requests, { params });
    return response.data;
  },

  createRecordRequest: async (data: Partial<RecordRequest>): Promise<RecordRequest> => {
    const response = await apiClient.post(API_ENDPOINTS.records.requests, data);
    return response.data;
  },

  updateRecordRequest: async (id: number, data: Partial<RecordRequest>): Promise<RecordRequest> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.records.requests}${id}/`, data);
    return response.data;
  },

  processRecordRequest: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.records.requests}${id}process/`);
    return response.data;
  },

  completeRecordRequest: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.records.requests}${id}complete/`);
    return response.data;
  },

  releaseRecordRequest: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_ENDPOINTS.records.requests}${id}release/`);
    return response.data;
  },
};