'use client';

import { Heart, ShoppingCart, Trash2, Package, Tag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

import { useCart } from '@/hooks/use-cart';
import {
  getWishlist,
  removeFromWishlist,
  formatPrice,
  getDiscountPercentage,
  type WishlistItem,
} from '@/lib/api/wishlist';

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const { cart, addItem } = useCart();

  const fetchWishlist = useCallback(async () => {
    try {
      const { items: data } = await getWishlist();
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (productId: string) => {
    setRemovingIds((prev) => new Set(prev).add(productId));

    try {
      await removeFromWishlist(productId);
      setItems((prev) => prev.filter((item) => item.productId !== productId));
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    try {
      await addItem({ productId: item.productId, quantity: 1 }, { openDrawer: false });
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Wishlist</h2>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} item{items.length !== 1 ? 's' : ''} saved
          </p>
        </div>
      </div>

      {/* Wishlist Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse"
            >
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-5 w-20 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Your wishlist is empty</h3>
          <p className="text-sm text-gray-500 mb-4">
            Save products you love for later by clicking the heart icon.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Package className="w-5 h-5" />
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const { product } = item;
            const discount = getDiscountPercentage(product.price, product.compareAtPrice);
            const isRemoving = removingIds.has(item.productId);
            const isAlreadyInCart = cart?.items?.some((cartItem) => cartItem.productId === item.productId);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all ${
                  isRemoving ? 'opacity-50' : ''
                }`}
              >
                {/* Product Image */}
                <Link href={`/products/${product.slug}`}>
                  <div className="relative h-48 bg-gray-100">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-300" />
                      </div>
                    )}

                    {discount && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        -{discount}%
                      </span>
                    )}

                    {!product.inStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white text-gray-900 text-sm font-semibold px-3 py-1 rounded">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product Info */}
                <div className="p-4">
                  {product.brand && (
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                      {product.brand}
                    </p>
                  )}

                  <Link href={`/products/${product.slug}`}>
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                    )}
                  </div>

                  {product.category && (
                    <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Tag className="w-3 h-3" />
                      {product.category}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={!product.inStock || isAlreadyInCart}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium disabled:cursor-not-allowed transition-colors ${
                        isAlreadyInCart
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {isAlreadyInCart ? 'Added to Cart' : 'Add to Cart'}
                    </button>

                    <button
                      onClick={() => handleRemove(item.productId)}
                      disabled={isRemoving}
                      className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
