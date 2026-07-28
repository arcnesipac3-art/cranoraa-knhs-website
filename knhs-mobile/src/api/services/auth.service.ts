import apiClient from '@api/client';
import { API_ENDPOINTS } from '@api/endpoints';
import { LoginRequest, LoginResponse, User, OTPRequest, ChangePasswordRequest, ForcePasswordChangeRequest } from '@api/types';

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.login, data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.auth.logout);
  },

  refreshToken: async (refreshToken: string): Promise<{ access: string; refresh: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.tokenRefresh, { refresh: refreshToken });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get(API_ENDPOINTS.auth.profile);
    return response.data;
  },

  getStudentProfile: async (): Promise<User> => {
    const response = await apiClient.get(API_ENDPOINTS.auth.studentProfile);
    return response.data;
  },

  verifyOtp: async (data: OTPRequest): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.verifyOtp, data);
    return response.data;
  },

  resendOtp: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.resendOtp, { email });
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.changePassword, data);
    return response.data;
  },

  forcePasswordChange: async (data: ForcePasswordChangeRequest): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.forcePasswordChange, data);
    return response.data;
  },
};