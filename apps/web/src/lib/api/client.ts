import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../auth/tokens';

import type { ApiError, ApiResponse } from '@ecommerce/types';

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

const API_BASE_URL = (() => {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
})();

const REQUEST_TIMEOUT = 15_000; // 15 seconds

// ──────────────────────────────────────────────────────────
// Axios instance
// ──────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

// ──────────────────────────────────────────────────────────
// Token refresh state — prevents parallel refresh calls
// ──────────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
}

// ──────────────────────────────────────────────────────────
// Request interceptor — attach access token
// ──────────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ──────────────────────────────────────────────────────────
// Response interceptor — handle 401 + silent token refresh
// ──────────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401 responses that haven't already been retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(normalizeError(error));
    }

    // Don't try to refresh if this *is* the refresh call
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearTokens();
      redirectToLogin();
      return Promise.reject(normalizeError(error));
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { data } = await axios.post<
        ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number }>
      >(`${API_BASE_URL}/auth/refresh`, { refreshToken });

      const { accessToken, refreshToken: newRefreshToken, expiresIn } = data.data;

      setTokens(accessToken, newRefreshToken, expiresIn);
      processQueue(null, accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      redirectToLogin();
      return Promise.reject(normalizeError(error));
    } finally {
      isRefreshing = false;
    }
  },
);

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/**
 * Normalize an Axios error into a consistent shape that callers can
 * inspect without coupling to Axios internals.
 *
 * Tolerates three response shapes:
 *   - { error: { code, message, details } }  (typed ApiError envelope)
 *   - { message, error, statusCode, errorCode?, details? }  (NestJS / global filter)
 *   - { message: string[], error, statusCode }  (NestJS class-validator)
 */
function normalizeError(error: AxiosError<ApiError>): ApiClientError {
  if (error.response) {
    const body = error.response.data as
      | (ApiError & {
          message?: string | string[];
          errorCode?: string;
          details?: Record<string, string[]>;
        })
      | undefined;

    const nestedMessage = typeof body?.error === 'object' ? body.error?.message : undefined;
    const flatMessage = (body as { message?: string | string[] } | undefined)?.message;
    const message =
      nestedMessage ??
      (Array.isArray(flatMessage) ? flatMessage.join(', ') : flatMessage) ??
      error.message;

    const code =
      (typeof body?.error === 'object' ? body.error?.code : undefined) ??
      body?.errorCode ??
      'UNKNOWN_ERROR';

    const details =
      (typeof body?.error === 'object' ? body.error?.details : undefined) ?? body?.details;

    return new ApiClientError(message, error.response.status, code, details);
  }

  if (error.request) {
    return new ApiClientError(
      'No response received from server. Please check your connection.',
      0,
      'NETWORK_ERROR',
    );
  }

  return new ApiClientError(error.message, 0, 'REQUEST_ERROR');
}

/**
 * Redirect to the login page (client-side only).
 */
function redirectToLogin() {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (currentPath !== '/login') {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }
}

// ──────────────────────────────────────────────────────────
// Custom Error class
// ──────────────────────────────────────────────────────────

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  /** True when the server couldn't be reached at all. */
  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR';
  }

  /** True for 4xx status codes. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** True for 5xx status codes. */
  get isServerError(): boolean {
    return this.status >= 500;
  }
}
