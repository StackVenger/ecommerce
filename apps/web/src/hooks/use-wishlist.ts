'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getWishlist, addToWishlist, removeFromWishlist } from '@/lib/api/wishlist';

interface UseWishlistReturn {
  /** Set of product IDs currently in the wishlist */
  wishlist: Set<string>;
  /** Toggle a product in/out of the wishlist (calls the API) */
  toggleWishlist: (productId: string) => void;
  /** Whether the initial load is in progress */
  isLoading: boolean;
}

export function useWishlist(): UseWishlistReturn {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const loadedRef = useRef(false);

  // Load wishlist from API on mount (authenticated users only)
  useEffect(() => {
    if (!isAuthenticated || loadedRef.current) {
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const items = await getWishlist();
        if (!cancelled) {
          setWishlist(new Set(items.map((item) => item.productId)));
          loadedRef.current = true;
        }
      } catch {
        // Silently fail — wishlist is non-critical
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Reset when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setWishlist(new Set());
      loadedRef.current = false;
    }
  }, [isAuthenticated]);

  const toggleWishlist = useCallback(
    (productId: string) => {
      if (!isAuthenticated) {
        toast.error('Please login to use your wishlist');
        return;
      }

      const isCurrentlyInWishlist = wishlist.has(productId);

      // Optimistic update
      setWishlist((prev) => {
        const next = new Set(prev);
        if (isCurrentlyInWishlist) {
          next.delete(productId);
        } else {
          next.add(productId);
        }
        return next;
      });

      // Call API in background
      const apiCall = isCurrentlyInWishlist
        ? removeFromWishlist(productId)
        : addToWishlist(productId);

      apiCall.catch((err) => {
        // Revert on failure
        setWishlist((prev) => {
          const next = new Set(prev);
          if (isCurrentlyInWishlist) {
            next.add(productId);
          } else {
            next.delete(productId);
          }
          return next;
        });
        toast.error(getApiErrorMessage(err, 'Failed to update wishlist'));
      });
    },
    [isAuthenticated, wishlist],
  );

  return { wishlist, toggleWishlist, isLoading };
}
