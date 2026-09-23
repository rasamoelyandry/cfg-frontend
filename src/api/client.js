import axios from 'axios';
import { readAuthState, writeAccessToken, clearAuthState } from '../utils/authStorage.js';

const BASE_URL = '/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token to every request
client.interceptors.request.use(
  (config) => {
    const token = readAuthState()?.accessToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Calls /auth/refresh and persists the new access token. A transient network
// hiccup (brief backend restart, flaky connection) gets one retry so it
// doesn't force a full logout on its own — only a real auth failure (401/403
// from the server) does.
async function doRefresh(refreshToken) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      const newAccessToken = res.data.data.accessToken;
      writeAccessToken(newAccessToken);
      return newAccessToken;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      if (status === 401 || status === 403) throw err;
      if (attempt === 0) await sleep(800);
    }
  }
  throw lastError;
}

// Proactively refreshes the access token if we have a session, without
// waiting for a request to fail first. Called once on app startup so a
// day-old access token is renewed silently before any page loads data.
export async function silentRefresh() {
  const refreshToken = readAuthState()?.refreshToken;
  if (!refreshToken) return;
  try {
    await doRefresh(refreshToken);
  } catch {
    // Leave it to the normal request/response flow to handle a genuinely
    // invalid session — don't force a logout from a background check.
  }
}

// Track if a refresh is already in progress to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest._retry) {
      // Refresh succeeded but the retried request still got 401 — force logout.
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = readAuthState()?.refreshToken;

      if (!refreshToken) {
        isRefreshing = false;
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        const newAccessToken = await doRefresh(refreshToken);
        client.defaults.headers['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

let redirectingToLogin = false;

function clearAuthAndRedirect() {
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  clearAuthState();
  window.location.href = '/login';
}

export default client;
