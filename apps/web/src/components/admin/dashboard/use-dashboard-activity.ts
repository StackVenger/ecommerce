'use client';

import { useEffect, useState } from 'react';

import { fetchDashboardActivity, type ActivityData } from '@/lib/api/admin';

/**
 * Activity data for the dashboard widgets. When the caller passes
 * `data` (even `null` while its own request is in flight) the widget is
 * controlled and does not fetch; otherwise it loads the feed itself so
 * each widget still works standalone.
 */
export function useDashboardActivity(data?: ActivityData | null, loading?: boolean) {
  const controlled = data !== undefined;
  const [fetched, setFetched] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(!controlled);

  useEffect(() => {
    if (controlled) {
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const result = await fetchDashboardActivity();
        if (!cancelled) {
          setFetched(result);
        }
      } catch (err) {
        console.error('Failed to load dashboard activity:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [controlled]);

  return {
    activity: controlled ? data : fetched,
    isLoading: controlled ? Boolean(loading) : isLoading,
  };
}
