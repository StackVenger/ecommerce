import { apiClient } from './client';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  brand: string | null;
  category: string | null;
  inStock: boolean;
  stock: number;
}

export interface WishlistItem {
  id: string;
  productId: string;
  product: WishlistProduct;
  addedAt: string;
}

// ──────────────────────────────────────────────────────────
// API Functions
// ──────────────────────────────────────────────────────────

export async function getWishlist(): Promise<{
  items: WishlistItem[];
  removedItems: { name: string; reason: 'archived' }[];
}> {
  const response = await apiClient.get<{
    success: boolean;
    data: WishlistItem[];
    count: number;
    removedItems?: { name: string; reason: 'archived' }[];
  }>('/wishlist');

  return {
    items: response.data.data,
    removedItems: response.data.removedItems ?? [],
  };
}

export async function addToWishlist(productId: string): Promise<void> {
  await apiClient.post(`/wishlist/${productId}`);
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await apiClient.delete(`/wishlist/${productId}`);
}

export async function isInWishlist(productId: string): Promise<boolean> {
  const response = await apiClient.get<{
    success: boolean;
    data: { inWishlist: boolean };
  }>(`/wishlist/check/${productId}`);

  return response.data.data.inWishlist;
}

export async function getWishlistCount(): Promise<number> {
  const response = await apiClient.get<{
    success: boolean;
    data: { count: number };
  }>('/wishlist/count');

  return response.data.data.count;
}

/**
 * Format price in BDT with ৳ symbol.
 */
export function formatPrice(price: number): string {
  return `৳${price.toLocaleString('en-BD')}`;
}

/**
 * Calculate discount percentage between compare-at and current price.
 */
export function getDiscountPercentage(
  price: number,
  compareAtPrice: number | null,
): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
