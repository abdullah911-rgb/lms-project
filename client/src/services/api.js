import axios from 'axios';
import { API_URL } from '../constants';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AUTH_SESSION_EXPIRED = 'auth:session-expired';

function isAuthFailure(error) {
  const status = error.response?.status;
  return status === 401 || status === 403;
}

function isTransientError(error) {
  return !error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error';
}

function clearSession() {
  localStorage.removeItem('accessToken');
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED));
}

function ensureHeaders(config) {
  if (!config.headers) {
    config.headers = {};
  }
  return config.headers;
}

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const headers = ensureHeaders(config);
      headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // #region agent log
    fetch('http://127.0.0.1:7426/ingest/3c625e6b-f1af-45ab-a819-1fb708d0e578',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'947982'},body:JSON.stringify({sessionId:'947982',runId:'initial',hypothesisId:'H1',location:'api.js:responseError',message:'API interceptor received error',data:{message:error?.message||null,status:error?.response?.status||null,hasConfig:Boolean(originalRequest),url:originalRequest?.url||null,hasHeaders:Boolean(originalRequest?.headers)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (!originalRequest?.url) {
      return Promise.reject(error);
    }

    if (
      originalRequest.url.includes('/auth/refresh') ||
      originalRequest.url.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            const headers = ensureHeaders(originalRequest);
            headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const accessToken = data?.data?.accessToken;
        if (!accessToken) {
          throw new Error('Invalid refresh response');
        }

        localStorage.setItem('accessToken', accessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        const headers = ensureHeaders(originalRequest);
        headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (isAuthFailure(refreshError) && !isTransientError(refreshError)) {
          clearSession();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
