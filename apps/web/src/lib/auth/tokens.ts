// ──────────────────────────────────────────────────────────
// Token management — cookie-based storage for JWT tokens
// ──────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'ecom_access_token';
const REFRESH_TOKEN_KEY = 'ecom_refresh_token';

// ──────────────────────────────────────────────────────────
// Cookie helpers (client-side only)
// ──────────────────────────────────────────────────────────

function setCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
  options: { secure?: boolean; sameSite?: 'strict' | 'lax' | 'none' } = {},
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const { secure = process.env.NODE_ENV === 'production', sameSite = 'lax' } = options;

  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=/`,
    `max-age=${maxAgeSeconds}`,
    `SameSite=${sameSite}`,
  ];

  if (secure) {
    parts.push('Secure');
  }

  document.cookie = parts.join('; ');
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split('; ');

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split('=');
    if (decodeURIComponent(key?.trim() ?? '') === name) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return null;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0`;
}

// ──────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────

/**
 * Retrieve the current access token from cookies.
 * Returns `null` on the server or when no token is stored.
 */
export function getAccessToken(): string | null {
  return getCookie(ACCESS_TOKEN_KEY);
}

/**
 * Retrieve the current refresh token from cookies.
 * Returns `null` on the server or when no token is stored.
 */
export function getRefreshToken(): string | null {
  return getCookie(REFRESH_TOKEN_KEY);
}

/**
 * Store both tokens in cookies with appropriate expiry.
 *
 * @param accessToken  - Short-lived JWT for API authorization.
 * @param refreshToken - Long-lived token used to obtain a new access token.
 * @param expiresIn    - Access token lifetime in seconds (from the API).
 */
export function setTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  refreshMaxAge: number = 30 * 24 * 60 * 60,
): void {
  // Access token — expires when the JWT itself expires (minus a small buffer)
  const accessMaxAge = Math.max(expiresIn - 30, 60); // at least 60 s
  setCookie(ACCESS_TOKEN_KEY, accessToken, accessMaxAge);

  // Refresh token — max-age matches the actual JWT lifetime (7d or 30d)
  setCookie(REFRESH_TOKEN_KEY, refreshToken, refreshMaxAge);
}

/**
 * Remove all auth tokens from cookies. Called on logout or when
 * a token refresh fails.
 */
export function clearTokens(): void {
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
}

/**
 * Check whether an access token exists (doesn't validate expiry).
 * Useful for quick client-side auth checks.
 */
export function hasAuthTokens(): boolean {
  return getAccessToken() !== null;
}
