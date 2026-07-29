import axios from 'axios';
import {
  saveSession,
  clearAccessToken,
  getAccessToken,
  getStoredUser,
  updateStoredUser,
  updateTokens,
  clearSession
} from './session';
import api, { API_BASE_URL } from './api';

// Aliases kept for backward compatibility
export { getAccessToken, getStoredUser, updateStoredUser, updateTokens, clearSession };

export const isAuthenticated = () => !!getAccessToken();
export const hasToken = () => !!getAccessToken();

// ---------------------------------------------------------------------------
// Token refresh - attempt to get a new access token using the httpOnly cookie
// Uses raw axios to bypass the api interceptor and avoid circular clearSession
// ---------------------------------------------------------------------------

export const tryRefreshToken = async () => {
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/token/refresh/`,
      {},
      { withCredentials: true }
    );
    if (data.access) {
      updateTokens(data.access);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export const loginRequest = async (identifier, password, role) => {
  const { data } = await api.post('/login/', {
    username: identifier,
    password,
    role,
  });

  if (data.must_change_password) {
    saveSession(data.access, data.user);
    return { ...data.user, must_change_password: true };
  }

  saveSession(data.access, data.user || { email: identifier });
  return data.user || { email: identifier };
};

export const logoutRequest = async () => {
  try {
    await api.post('/logout/');
  } catch {
    // Even if the request fails, clear local state
  } finally {
    clearSession();
  }
};

export const verifyOtp = async (email, code, type = 'signup') => {
  const { data } = await api.post('/verify-otp/', { email, code, type });
  return data;
};

export const resendOtp = async (email, type = 'signup') => {
  const { data } = await api.post('/resend-otp/', { email, type });
  return data;
};
