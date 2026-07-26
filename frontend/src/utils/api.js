import axios from 'axios';
import { getAccessToken, updateTokens, clearSession } from './session';

const RAW_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error('[FATAL] VITE_API_URL is not set. The app cannot reach the backend.');
}

// Loading state management
let activeRequests = 0;
let loadingCallbacks = [];

export const subscribeToLoadingState = (callback) => {
  loadingCallbacks.push(callback);
  return () => {
    loadingCallbacks = loadingCallbacks.filter(cb => cb !== callback);
  };
};

export const getActiveRequestsCount = () => activeRequests;

const notifyLoadingState = (isLoading) => {
  loadingCallbacks.forEach(callback => callback(isLoading));
};

function normalizeApiBaseUrl(apiUrl) {
  let value = apiUrl.replace(/\/+$/, '');

  try {
    const url = new URL(value);
    let pathname = url.pathname.replace(/\/+$/, '');

    // Ensure it ends with /api (but not /api/api)
    if (!pathname.endsWith('/api')) {
      pathname = `${pathname}/api`;
    }
    // Ensure it ends with /v1 after /api
    if (!pathname.endsWith('/v1')) {
      pathname = `${pathname}/v1`;
    }

    url.pathname = pathname;
    return url.toString().replace(/\/+$/, '');
  } catch {
    let result = value.endsWith('/api') ? value : `${value}/api`;
    return result.endsWith('/v1') ? result : `${result}/v1`;
  }
}

export const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

// Derive the WebSocket root URL from the API_BASE_URL using URL parsing
// so we don't accidentally corrupt URLs that contain 'http' or '/api' elsewhere.
function deriveWsRoot(apiUrl) {
  try {
    const url = new URL(apiUrl);
    url.pathname = url.pathname.replace(/\/api\/v1\/?$/, '') || '/';
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString().replace(/\/$/, '');
  } catch {
    return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/^http/, 'ws');
  }
}

function deriveMediaRoot(apiUrl) {
  try {
    const url = new URL(apiUrl);
    url.pathname = url.pathname.replace(/\/api\/v1\/?$/, '') || '/';
    return url.toString().replace(/\/$/, '');
  } catch {
    return apiUrl.replace(/\/api\/v1\/?$/, '');
  }
}

export const WS_ROOT = deriveWsRoot(API_BASE_URL);
export const MEDIA_ROOT = deriveMediaRoot(API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  // Send the httpOnly refresh-token cookie on same-origin requests to /api/token/
  withCredentials: true,
});

// Attach the short-lived access token (kept in memory via auth.js) to every request.
// The refresh token lives in an httpOnly cookie — JS never touches it directly.
// Also track loading state for UI feedback
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Track request start time for 200ms threshold
  config.metadata = { startTime: Date.now() };
  
  // Increment active requests counter
  activeRequests++;
  
  // Delay loading indicator by 200ms to avoid flashing for quick requests
  config.metadata.loadingTimeout = setTimeout(() => {
    if (activeRequests > 0) {
      notifyLoadingState(true);
    }
  }, 200);

  return config;
}, (error) => {
  // Decrement on request error
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    notifyLoadingState(false);
  }
  return Promise.reject(error);
});

// On 401, ask the backend to rotate the refresh token (cookie → cookie) and
// return a new access token. If that also fails, clear the session.
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Clear loading timeout and decrement counter
    if (response.config.metadata?.loadingTimeout) {
      clearTimeout(response.config.metadata.loadingTimeout);
    }
    
    activeRequests = Math.max(0, activeRequests - 1);
    
    if (activeRequests === 0) {
      notifyLoadingState(false);
    }
    
    return response;
  },
  async (error) => {
    // Clear loading timeout and decrement counter on error
    if (error.config?.metadata?.loadingTimeout) {
      clearTimeout(error.config.metadata.loadingTimeout);
    }
    
    activeRequests = Math.max(0, activeRequests - 1);
    
    if (activeRequests === 0) {
      notifyLoadingState(false);
    }
    const original = error.config;

    if (!original) return Promise.reject(error);

    // Never retry the refresh endpoint itself — avoids infinite loops
    // Never retry /login/ — a 401 there means wrong credentials, not expired token
    if (original.url?.includes('/token/refresh/') || original.url?.includes('/login/')) {
      if (original.url?.includes('/token/refresh/')) clearSession();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // POST with no body — the backend reads the refresh token from the httpOnly cookie.
        // withCredentials ensures the cookie is sent cross-origin in production.
        const { data } = await axios.post(
          `${API_BASE_URL}/token/refresh/`,
          {},
          { withCredentials: true }
        );

        // Store the short-lived access token in memory (not localStorage)
        updateTokens(data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        processQueue(null, data.access);
        return api(original);
      } catch {
        processQueue(error);
        clearSession();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
