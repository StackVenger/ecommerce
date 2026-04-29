'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

import type { AuthUser, LoginRequest, RegisterRequest } from '@ecommerce/types';

import * as authApi from '@/lib/api/auth';
import { clearTokens, getRefreshToken, hasAuthTokens, setTokens } from '@/lib/auth/tokens';

// ──────────────────────────────────────────────────────────
// Context value shape
// ──────────────────────────────────────────────────────────

export interface AuthContextValue {
  /** The currently authenticated user, or `null` if logged out. */
  user: AuthUser | null;
  /** `true` while the initial auth check is in progress. */
  isLoading: boolean;
  /** `true` when any auth mutation (login, register, logout) is in flight. */
  isSubmitting: boolean;
  /** Whether the user is authenticated (user !== null). */
  isAuthenticated: boolean;
  /** Log in with email and password. */
  login: (payload: LoginRequest) => Promise<void>;
  /** Create a new account and auto-login. */
  register: (payload: RegisterRequest) => Promise<void>;
  /** Log in with a Firebase ID token (Google / Facebook via Firebase Auth). */
  loginWithFirebase: (idToken: string) => Promise<void>;
  /** Log out and clear tokens. */
  logout: () => Promise<void>;
  /** Permanently delete the current account, then sign out locally. */
  deleteAccount: (password?: string) => Promise<void>;
  /** Re-fetch the user profile from the server. */
  refreshUser: () => Promise<void>;
}

// ──────────────────────────────────────────────────────────
// Context (exported for direct consumption if needed)
// ──────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ──────────────────────────────────────────────────────────
// Token refresh interval — refresh 2 minutes before expiry.
// Default access token lifetime is 15 min, so we refresh
// every 13 minutes.
// ──────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 13 * 60 * 1000;

// ──────────────────────────────────────────────────────────
// Provider component
// ──────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ──────────────────────────────────────────────

  const startAutoRefresh = useCallback(() => {
    stopAutoRefresh();
    refreshTimerRef.current = setInterval(async () => {
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          return;
        }

        const tokens = await authApi.refreshTokens(refreshToken);
        setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
      } catch {
        // Refresh failed — clear everything and let the user re-login
        clearTokens();
        setUser(null);
        stopAutoRefresh();
      }
    }, REFRESH_INTERVAL_MS);
  }, []);

  function stopAutoRefresh() {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }

  // ── Initial auth check ──────────────────────────────────

  useEffect(() => {
    async function initAuth() {
      if (!hasAuthTokens()) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await authApi.getProfile();
        setUser(profile);
        startAutoRefresh();
      } catch {
        // Token is invalid or expired — clear it
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    void initAuth();

    return () => {
      stopAutoRefresh();
    };
  }, [startAutoRefresh]);

  // ── Auth actions ────────────────────────────────────────

  const login = useCallback(
    async (payload: LoginRequest) => {
      setIsSubmitting(true);
      try {
        const response = await authApi.login(payload);
        const { tokens, user: authUser, refreshMaxAge } = response;
        setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn, refreshMaxAge);
        setUser(authUser);
        startAutoRefresh();
      } finally {
        setIsSubmitting(false);
      }
    },
    [startAutoRefresh],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      setIsSubmitting(true);
      try {
        const response = await authApi.register(payload);
        const { tokens, user: authUser } = response;
        setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
        setUser(authUser);
        startAutoRefresh();
      } finally {
        setIsSubmitting(false);
      }
    },
    [startAutoRefresh],
  );

  const loginWithFirebase = useCallback(
    async (idToken: string) => {
      setIsSubmitting(true);
      try {
        const response = await authApi.firebaseLogin(idToken);
        const { tokens, user: authUser } = response;
        setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
        setUser(authUser);
        startAutoRefresh();
      } finally {
        setIsSubmitting(false);
      }
    },
    [startAutoRefresh],
  );

  const logout = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await authApi.logout();
    } catch {
      // Even if the server request fails, clear local state
    } finally {
      clearTokens();
      setUser(null);
      stopAutoRefresh();
      setIsSubmitting(false);
      toast.success('Logged out successfully');
      window.location.href = '/';
    }
  }, []);

  const deleteAccount = useCallback(async (password?: string) => {
    setIsSubmitting(true);
    try {
      await authApi.deleteAccount(password);
      // Server has already invalidated the user; clear local auth state.
      clearTokens();
      setUser(null);
      stopAutoRefresh();
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.getProfile();
      setUser(profile);
    } catch {
      clearTokens();
      setUser(null);
      stopAutoRefresh();
    }
  }, []);

  // ── Context value (memoized to prevent needless re-renders) ──

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isSubmitting,
      isAuthenticated: user !== null,
      login,
      register,
      loginWithFirebase,
      logout,
      deleteAccount,
      refreshUser,
    }),
    [
      user,
      isLoading,
      isSubmitting,
      login,
      register,
      loginWithFirebase,
      logout,
      deleteAccount,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
