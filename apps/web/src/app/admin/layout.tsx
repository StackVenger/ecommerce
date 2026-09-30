'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminTopbar } from '@/components/admin/admin-topbar';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Admin Layout
// ──────────────────────────────────────────────────────────

/**
 * Admin layout with collapsible sidebar and top bar.
 *
 * Only accessible to users with ADMIN or SUPER_ADMIN roles.
 * Redirects unauthorized users to the login page.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleDesktopSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-gray-500">Loading admin panel</p>
        </div>
      </div>
    );
  }

  // Redirect non-admin users
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    router.push('/login?redirect=/admin');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeMobileSidebar} />
      )}

      {/* Sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleDesktopSidebar}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
      />

      {/* Main content area */}
      <div
        className={cn(
          'flex min-h-screen flex-col border-gray-200 transition-all duration-300 lg:border-l',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64',
        )}
      >
        {/* Top bar */}
        <AdminTopbar
          sidebarCollapsed={sidebarCollapsed}
          onMenuToggle={toggleMobileSidebar}
          onDesktopToggle={toggleDesktopSidebar}
        />

        {/* Page content */}
        <main className="min-w-0 flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
