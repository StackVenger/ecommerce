'use client';

import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';

/**
 * Hook to access the current authentication state and actions.
 *
 * Must be used within an `<AuthProvider>`.
 *
 * @example
 * ```tsx
 * function NavBar() {
 *   const { user, isAuthenticated, logout } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <Link href="/login">Sign In</Link>;
 *   }
 *
 *   return (
 *     <div>
 *       <span>Welcome, {user.firstName}!</span>
 *       <button onClick={logout}>Log out</button>
 *     </div>
 *   );
 * }
 * ```
 */
const defaultAuthValue: AuthContextValue = {
  user: null,
  isLoading: true,
  isSubmitting: false,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  loginWithFirebase: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  refreshUser: async () => {},
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  // Return safe defaults during SSR or when provider is not yet mounted
  if (context === undefined) {
    return defaultAuthValue;
  }

  return context;
}
