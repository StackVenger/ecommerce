'use client';

import { Check, Heart, ShoppingCart, Trash2, Package, Tag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

import { EmptyState, PageHeader, SkeletonBlock } from '@/components/ui/bento';
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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="My Wishlist"
        description={`${items.length} item${items.length !== 1 ? 's' : ''} saved`}
        className="mb-0 sm:mb-0"
      />

      {/* Wishlist Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonBlock key={i} className="h-80 rounded-[1.75rem] bg-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save products you love for later by clicking the heart icon."
          action={
            <Link href="/" className="btn btn-primary">
              <Package className="h-4 w-4" strokeWidth={2.5} />
              Browse Products
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          {items.map((item) => {
            const { product } = item;
            const discount = getDiscountPercentage(product.price, product.compareAtPrice);
            const isRemoving = removingIds.has(item.productId);
            const isAlreadyInCart = cart?.items?.some(
              (cartItem) => cartItem.productId === item.productId,
            );

            return (
              <div
                key={item.id}
                className={`product-card group flex flex-col ${isRemoving ? 'opacity-50' : ''}`}
              >
                {/* Product Image */}
                <Link href={`/products/${product.slug}`} className="block">
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="product-card-image h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}

                    {discount && (
                      <span className="absolute left-3 top-3 z-10 rounded-lg bg-rose-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm sm:left-4 sm:top-4">
                        -{discount}%
                      </span>
                    )}

                    {!product.inStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <span className="rounded-xl bg-card px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-900">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Remove */}
                <button
                  onClick={() => handleRemove(item.productId)}
                  disabled={isRemoving}
                  className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-foreground/[0.03] bg-card/90 text-gray-500 shadow-sm backdrop-blur-sm transition-all hover:text-rose-500 sm:right-4 sm:top-4 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
                  title="Remove from wishlist"
                  aria-label={`Remove ${product.name} from wishlist`}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                </button>

                {/* Product Info */}
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  {product.brand && <p className="eyebrow mb-1 truncate">{product.brand}</p>}

                  <Link href={`/products/${product.slug}`}>
                    <h3 className="line-clamp-2 text-sm font-bold text-gray-900 transition-colors group-hover:text-primary">
                      {product.name}
                    </h3>
                  </Link>

                  {product.category && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-gray-500">
                      <Tag className="h-3 w-3" strokeWidth={2.5} />
                      <span className="truncate">{product.category}</span>
                    </p>
                  )}

                  {/* Price + action */}
                  <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-lg font-black tabular-nums tracking-tighter text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-[11px] font-bold text-gray-400 line-through">
                          {formatPrice(product.compareAtPrice)}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={!product.inStock || isAlreadyInCart}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed ${
                        isAlreadyInCart
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-brand-50 text-brand-600 hover:bg-primary hover:text-white disabled:opacity-50'
                      }`}
                      aria-label={
                        isAlreadyInCart
                          ? `${product.name} is in your cart`
                          : `Add ${product.name} to cart`
                      }
                      title={isAlreadyInCart ? 'Added to Cart' : 'Add to Cart'}
                    >
                      {isAlreadyInCart ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        <ShoppingCart className="h-4 w-4" strokeWidth={2.5} />
                      )}
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
