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

import type { Cart, CartItem, AddCartItemPayload } from '@/lib/api/cart';

import * as cartApi from '@/lib/api/cart';
import { getApiErrorMessage } from '@/lib/api/errors';

// ──────────────────────────────────────────────────────────
// Context value shape
// ──────────────────────────────────────────────────────────

export interface CartContextValue {
  /** The current cart state */
  cart: Cart | null;
  /** Whether the cart is being loaded initially */
  isLoading: boolean;
  /** Whether a cart mutation is in progress */
  isUpdating: boolean;
  /** Number of items in the cart */
  itemCount: number;
  /** Whether the cart drawer is open */
  isOpen: boolean;
  /** Open the cart drawer */
  openCart: () => void;
  /** Close the cart drawer */
  closeCart: () => void;
  /** Toggle the cart drawer */
  toggleCart: () => void;
  /** Add an item to the cart (optimistic) */
  addItem: (payload: AddCartItemPayload) => Promise<void>;
  /** Update a cart item's quantity (optimistic) */
  updateItemQuantity: (itemId: string, quantity: number) => Promise<void>;
  /** Remove an item from the cart (optimistic) */
  removeItem: (itemId: string) => Promise<void>;
  /** Clear all items from the cart */
  clearCart: () => Promise<void>;
  /** Apply a coupon code */
  applyCoupon: (code: string) => Promise<void>;
  /** Remove the applied coupon */
  removeCoupon: () => Promise<void>;
  /** Refresh cart data from the server */
  refreshCart: () => Promise<void>;
  /** Merge guest cart after login */
  mergeGuestCart: () => Promise<void>;
}

// ──────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────

export const CartContext = createContext<CartContextValue | undefined>(undefined);

// ──────────────────────────────────────────────────────────
// Helper: create an empty cart for optimistic updates
// ──────────────────────────────────────────────────────────

function emptyCart(): Cart {
  return {
    id: '',
    userId: null,
    sessionId: null,
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    itemCount: 0,
    couponCode: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Recalculate cart totals from items (for optimistic updates).
 */
function recalculateCart(cart: Cart): Cart {
  const subtotal = cart.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = Math.max(0, subtotal - cart.discount);
  const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);

  return { ...cart, subtotal, total, itemCount };
}

// ──────────────────────────────────────────────────────────
// Provider component
// ──────────────────────────────────────────────────────────

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const previousCartRef = useRef<Cart | null>(null);

  // ── Initial fetch ──────────────────────────────────────

  useEffect(() => {
    async function loadCart() {
      try {
        const data = await cartApi.getCart();
        setCart(data);
      } catch {
        setCart(emptyCart());
      } finally {
        setIsLoading(false);
      }
    }

    loadCart();
  }, []);

  // ── Drawer controls ────────────────────────────────────

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  // ── Optimistic update helpers ──────────────────────────

  /**
   * Save current cart state before mutation (for rollback on error).
   */
  const savePreviousCart = useCallback(() => {
    previousCartRef.current = cart ? { ...cart, items: [...cart.items] } : null;
  }, [cart]);

  /**
   * Rollback to previous cart state on error.
   */
  const rollback = useCallback(() => {
    if (previousCartRef.current) {
      setCart(previousCartRef.current);
    }
  }, []);

  // ── Cart mutations ─────────────────────────────────────

  const addItem = useCallback(
    async (payload: AddCartItemPayload) => {
      setIsUpdating(true);
      savePreviousCart();

      // Optimistic update: add or increment item
      setCart((prev) => {
        if (!prev) {
          return prev;
        }
        const existingIndex = prev.items.findIndex(
          (item) =>
            item.productId === payload.productId && item.variantId === (payload.variantId || null),
        );

        let updatedItems: CartItem[];

        if (existingIndex >= 0) {
          updatedItems = prev.items.map((item, i) =>
            i === existingIndex
              ? {
                  ...item,
                  quantity: item.quantity + payload.quantity,
                  lineTotal: item.price * (item.quantity + payload.quantity),
                }
              : item,
          );
        } else {
          // For optimistic add, we don't have full product details yet
          // Keep items as-is; the real data comes from the server
          updatedItems = [...prev.items];
        }

        const updated = recalculateCart({ ...prev, items: updatedItems });
        // Ensure itemCount reflects the pending add even without full product data
        if (existingIndex < 0) {
          updated.itemCount = (updated.itemCount || 0) + payload.quantity;
        }
        return updated;
      });

      try {
        const updatedCart = await cartApi.addCartItem(payload);
        setCart(updatedCart);
        setIsOpen(true);
        toast.success('Added to cart');
      } catch (error) {
        rollback();
        toast.error(getApiErrorMessage(error, 'Failed to add item to cart'));
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [savePreviousCart, rollback],
  );

  const updateItemQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      setIsUpdating(true);
      savePreviousCart();

      // Optimistic update
      setCart((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedItems = prev.items.map((item) =>
          item.id === itemId ? { ...item, quantity, lineTotal: item.price * quantity } : item,
        );
        return recalculateCart({ ...prev, items: updatedItems });
      });

      try {
        const updatedCart = await cartApi.updateCartItem(itemId, { quantity });
        setCart(updatedCart);
      } catch (error) {
        rollback();
        toast.error(getApiErrorMessage(error, 'Failed to update quantity'));
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [savePreviousCart, rollback],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      setIsUpdating(true);
      savePreviousCart();

      // Optimistic update: remove item
      setCart((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedItems = prev.items.filter((item) => item.id !== itemId);
        return recalculateCart({ ...prev, items: updatedItems });
      });

      try {
        const updatedCart = await cartApi.removeCartItem(itemId);
        setCart(updatedCart);
        toast.success('Item removed from cart');
      } catch (error) {
        rollback();
        toast.error(getApiErrorMessage(error, 'Failed to remove item'));
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [savePreviousCart, rollback],
  );

  const clearCartAction = useCallback(async () => {
    setIsUpdating(true);
    savePreviousCart();

    // Optimistic update: clear all items
    setCart((prev) =>
      prev
        ? {
            ...prev,
            items: [],
            subtotal: 0,
            discount: 0,
            total: 0,
            itemCount: 0,
            couponCode: null,
          }
        : prev,
    );

    try {
      const updatedCart = await cartApi.clearCart();
      setCart(updatedCart);
      toast.success('Cart cleared');
    } catch (error) {
      rollback();
      toast.error(getApiErrorMessage(error, 'Failed to clear cart'));
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [savePreviousCart, rollback]);

  const applyCouponAction = useCallback(async (code: string) => {
    setIsUpdating(true);
    try {
      const updatedCart = await cartApi.applyCoupon({ code });
      setCart(updatedCart);
      toast.success(`Coupon "${code}" applied`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid or expired coupon code'));
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const removeCouponAction = useCallback(async () => {
    setIsUpdating(true);
    savePreviousCart();

    // Optimistic update
    setCart((prev) => (prev ? recalculateCart({ ...prev, couponCode: null, discount: 0 }) : prev));

    try {
      const updatedCart = await cartApi.removeCoupon();
      setCart(updatedCart);
      toast.success('Coupon removed');
    } catch (error) {
      rollback();
      toast.error(getApiErrorMessage(error, 'Failed to remove coupon'));
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [savePreviousCart, rollback]);

  const refreshCart = useCallback(async () => {
    try {
      const data = await cartApi.getCart();
      setCart(data);
    } catch {
      // Silent fail on refresh
    }
  }, []);

  const mergeGuestCart = useCallback(async () => {
    try {
      const data = await cartApi.mergeCart();
      setCart(data);
      cartApi.clearSessionId();
    } catch {
      // Silent fail on merge
    }
  }, []);

  // ── Context value ──────────────────────────────────────

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isLoading,
      isUpdating,
      itemCount: cart?.itemCount ?? 0,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      updateItemQuantity,
      removeItem,
      clearCart: clearCartAction,
      applyCoupon: applyCouponAction,
      removeCoupon: removeCouponAction,
      refreshCart,
      mergeGuestCart,
    }),
    [
      cart,
      isLoading,
      isUpdating,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      updateItemQuantity,
      removeItem,
      clearCartAction,
      applyCouponAction,
      removeCouponAction,
      refreshCart,
      mergeGuestCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
