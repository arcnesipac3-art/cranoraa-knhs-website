import axios from 'axios';
import { getAccessToken, updateTokens, clearSession } from './session';
import apiCache from './apiCache';
import backgroundSync from './backgroundSync';

const RAW_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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

// ── Backend Reachability Tracking ─────────────────────────────────────────────
// Tracks consecutive API failures to detect when the backend is unreachable.
// Dispatches custom events consumed by useBackendStatus hook.
const BACKEND_FAILURE_THRESHOLD = 3;
let consecutiveBackendFailures = 0;

api.interceptors.response.use(
  (response) => {
    // Backend is reachable — reset failure counter
    if (consecutiveBackendFailures > 0) {
      consecutiveBackendFailures = 0;
      window.dispatchEvent(
        new CustomEvent('backend:reachable', {
          detail: { timestamp: Date.now() },
        })
      );
    }

    // Cache successful GET responses (except auth-sensitive endpoints)
    if (
      response.config.method === 'get' &&
      response.status === 200 &&
      !response.config.url?.includes('/token/') &&
      !response.config.url?.includes('/login') &&
      !response.config.url?.includes('/logout') &&
      !response.config.url?.includes('/password')
    ) {
      const cacheKey = response.config.url;
      if (cacheKey) {
        apiCache.set(cacheKey, response.data, 60 * 60 * 1000); // 1 hour TTL
      }
    }

    return response;
  },
  (error) => {
    // Track consecutive backend failures
    if (!error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      consecutiveBackendFailures++;
      if (consecutiveBackendFailures >= BACKEND_FAILURE_THRESHOLD) {
        window.dispatchEvent(
          new CustomEvent('backend:unreachable', {
            detail: {
              failureCount: consecutiveBackendFailures,
              timestamp: Date.now(),
            },
          })
        );
      }
    }

    // Queue failed mutations for background sync
    if (
      error.config &&
      !error.config.url?.includes('/token/') &&
      !error.config.url?.includes('/login') &&
      !error.config.url?.includes('/logout') &&
      ['post', 'put', 'patch', 'delete'].includes(error.config.method)
    ) {
      const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
      if (isNetworkError) {
        backgroundSync.enqueue({
          url: error.config.url?.startsWith('http')
            ? error.config.url
            : `${API_BASE_URL}${error.config.url}`,
          method: error.config.method,
          data: error.config.data,
          headers: error.config.headers,
        });
      }
    }

    return Promise.reject(error);
  }
);
