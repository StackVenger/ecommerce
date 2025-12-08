import { apiClient } from './client';

import type {
  ApiResponse,
  AuthResponse,
  AuthTokens,
  AuthUser,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileInput,
} from '@ecommerce/types';

// ──────────────────────────────────────────────────────────
// Helpers — normalise the API response into the shape the
// frontend AuthResponse type expects.
// ──────────────────────────────────────────────────────────

/** Default access-token lifetime in seconds (15 min) used when the API doesn't return expiresIn. */
const DEFAULT_EXPIRES_IN = 900;

/** Convert a duration string like '7d' or '30d' to seconds. Returns undefined for unrecognised formats. */
function parseDurationToSeconds(duration: string | undefined): number | undefined {
  if (!duration) {
    return undefined;
  }
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) {
    return undefined;
  }
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 'd':
      return value * 86400;
    case 'h':
      return value * 3600;
    case 'm':
      return value * 60;
    case 's':
      return value;
    default:
      return undefined;
  }
}

function normalizeAuthResponse(raw: any): AuthResponse & { refreshMaxAge?: number } {
  // The API returns { user, accessToken, refreshToken } (flat)
  // but the frontend type expects { user, tokens: { accessToken, refreshToken, expiresIn, tokenType } }
  const user: AuthUser = {
    id: raw.user.id,
    email: raw.user.email,
    firstName: raw.user.firstName,
    lastName: raw.user.lastName,
    fullName: `${raw.user.firstName} ${raw.user.lastName}`,
    role: raw.user.role,
    avatar: raw.user.avatar ?? undefined,
    emailVerified: raw.user.emailVerified ?? false,
    phone: raw.user.phone ?? undefined,
    createdAt: raw.user.createdAt,
  };

  const tokens: AuthTokens = raw.tokens
    ? raw.tokens
    : {
        accessToken: raw.accessToken,
        refreshToken: raw.refreshToken,
        expiresIn: raw.expiresIn ?? DEFAULT_EXPIRES_IN,
        tokenType: 'Bearer' as const,
      };

  const refreshMaxAge = parseDurationToSeconds(raw.refreshExpiresIn as string | undefined);

  return { user, tokens, refreshMaxAge };
}

// ──────────────────────────────────────────────────────────
// Auth API functions
// ──────────────────────────────────────────────────────────

/**
 * Authenticate a user with email and password.
 */
export async function login(
  payload: LoginRequest,
): Promise<AuthResponse & { refreshMaxAge?: number }> {
  const { data } = await apiClient.post<ApiResponse<any>>('/auth/login', payload);
  return normalizeAuthResponse(data.data);
}

/**
 * Register a new customer account.
 */
export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<ApiResponse<any>>('/auth/register', payload);
  return normalizeAuthResponse(data.data);
}

/**
 * Exchange a refresh token for a new token pair.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<ApiResponse<any>>('/auth/refresh', { refreshToken });

  // The refresh endpoint also returns flat tokens
  const raw = data.data;
  return raw.tokens
    ? raw.tokens
    : {
        accessToken: raw.accessToken,
        refreshToken: raw.refreshToken,
        expiresIn: raw.expiresIn ?? DEFAULT_EXPIRES_IN,
        tokenType: 'Bearer' as const,
      };
}

/**
 * Verify an email address using the token sent to the user's inbox.
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>('/auth/verify-email', {
    token,
  });
  return data.data;
}

/**
 * Resend the email verification link/OTP.
 */
export async function resendVerificationEmail(): Promise<{ message: string }> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
    '/auth/resend-verification',
  );
  return data.data;
}

/**
 * Request a password reset link to be sent to the given email.
 */
export async function forgotPassword(payload: ForgotPasswordRequest): Promise<{ message: string }> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
    '/auth/forgot-password',
    payload,
  );
  return data.data;
}

/**
 * Reset password using the token from the password-reset email.
 */
export async function resetPassword(payload: ResetPasswordRequest): Promise<{ message: string }> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
    '/auth/reset-password',
    payload,
  );
  return data.data;
}

/**
 * Change the password for the currently logged-in user.
 * Requires the current password for verification.
 */
export async function changePassword(payload: ChangePasswordRequest): Promise<{ message: string }> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
    '/auth/change-password',
    payload,
  );
  return data.data;
}

/**
 * Retrieve the currently authenticated user's profile.
 * API endpoint is /auth/me (not /auth/profile).
 */
export async function getProfile(): Promise<AuthUser> {
  const { data } = await apiClient.get<ApiResponse<any>>('/auth/me');
  const raw = data.data;
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    fullName: `${raw.firstName} ${raw.lastName}`,
    role: raw.role,
    avatar: raw.avatar ?? undefined,
    emailVerified: raw.emailVerified ?? false,
    phone: raw.phone ?? undefined,
    createdAt: raw.createdAt,
  };
}

/**
 * Update the currently authenticated user's profile fields.
 * API endpoint is /auth/me (not /auth/profile).
 */
export async function updateProfile(payload: UpdateProfileInput): Promise<AuthUser> {
  const { data } = await apiClient.patch<ApiResponse<any>>('/auth/me', payload);
  const raw = data.data;
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    fullName: `${raw.firstName} ${raw.lastName}`,
    role: raw.role,
    avatar: raw.avatar ?? undefined,
    emailVerified: raw.emailVerified ?? false,
    phone: raw.phone ?? undefined,
    createdAt: raw.createdAt,
  };
}

/**
 * Authenticate with a Google token (ID token or access token from @react-oauth/google).
 */
export async function googleLogin(
  token: string,
  tokenType: 'idToken' | 'accessToken' = 'accessToken',
): Promise<AuthResponse> {
  const { data } = await apiClient.post<ApiResponse<any>>('/auth/google', {
    [tokenType]: token,
  });
  return normalizeAuthResponse(data.data);
}

/**
 * Authenticate with a Facebook access token.
 */
export async function facebookLogin(accessToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<ApiResponse<any>>('/auth/facebook', {
    accessToken,
  });
  return normalizeAuthResponse(data.data);
}

/**
 * Authenticate with a Firebase phone ID token.
 */
export async function phoneLogin(idToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<ApiResponse<any>>('/auth/phone', {
    idToken,
  });
  return normalizeAuthResponse(data.data);
}

/**
 * Invalidate the current session / refresh token on the server.
 */
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
