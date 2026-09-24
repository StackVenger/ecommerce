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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-bento">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          </div>
          <p className="eyebrow">Loading admin panel</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={closeMobileSidebar}
        />
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
          'flex min-h-screen flex-col transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72',
        )}
      >
        {/* Top bar */}
        <AdminTopbar
          sidebarCollapsed={sidebarCollapsed}
          onMenuToggle={toggleMobileSidebar}
          onDesktopToggle={toggleDesktopSidebar}
        />

        {/* Page content */}
        <main className="min-w-0 flex-1 px-4 pb-10 pt-2 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
