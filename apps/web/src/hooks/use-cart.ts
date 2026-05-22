'use client';

import { useContext } from 'react';

import { CartContext, type CartContextValue } from '@/providers/cart-provider';

/**
 * Hook to access the shopping cart state and actions.
 *
 * Must be used within a `<CartProvider>`.
 *
 * @example
 * ```tsx
 * function ProductCard({ product }) {
 *   const { addItem, isUpdating } = useCart();
 *
 *   const handleAddToCart = () => {
 *     addItem({
 *       productId: product.id,
 *       quantity: 1,
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleAddToCart} disabled={isUpdating}>
 *       Add to Cart
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function CartBadge() {
 *   const { itemCount, toggleCart } = useCart();
 *
 *   return (
 *     <button onClick={toggleCart}>
 *       Cart ({itemCount})
 *     </button>
 *   );
 * }
 * ```
 */
const defaultCartValue: CartContextValue = {
  cart: null,
  isLoading: true,
  isUpdating: false,
  itemCount: 0,
  isOpen: false,
  openCart: () => {},
  closeCart: () => {},
  toggleCart: () => {},
  addItem: async () => {},
  updateItemQuantity: async () => {},
  removeItem: async () => {},
  clearCart: async () => {},
  applyCoupon: async () => {},
  removeCoupon: async () => {},
  refreshCart: async () => {},
  mergeGuestCart: async () => {},
  setTempQuantity: () => {},
};

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  // Return safe defaults during SSR or when provider is not yet mounted
  if (context === undefined) {
    return defaultCartValue;
  }

  return context;
}
