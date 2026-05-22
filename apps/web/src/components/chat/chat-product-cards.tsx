'use client';

import { ShoppingCart, Package } from 'lucide-react';
import Link from 'next/link';

import type { ChatProductCard } from '@/lib/api/chat';

import { useCart } from '@/hooks/use-cart';

interface ChatProductCardsProps {
  products: ChatProductCard[];
}

function formatPrice(price: number) {
  return `৳${price.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function ChatProductCards({ products }: ChatProductCardsProps) {
  const { addItem } = useCart();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      {products.map((product) => {
        const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
        const discountPercent = hasDiscount
          ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
          : 0;

        return (
          <div
            key={product.slug}
            className="flex-shrink-0 w-44 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm"
          >
            {/* Product image */}
            <div className="relative h-28 w-full bg-gray-50">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="w-8 h-8 text-gray-300" />
                </div>
              )}
              {hasDiscount && (
                <span className="absolute top-1 left-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  -{discountPercent}%
                </span>
              )}
            </div>

            {/* Product info */}
            <div className="p-2.5 space-y-1.5">
              <Link
                href={`/products/${product.slug}`}
                className="block text-xs font-medium text-gray-900 hover:text-primary transition-colors line-clamp-2 leading-tight"
              >
                {product.name}
              </Link>

              {product.averageRating > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-yellow-500">&#9733;</span>
                  <span className="text-[11px] text-gray-500">
                    {product.averageRating.toFixed(1)} ({product.totalReviews})
                  </span>
                </div>
              )}

              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && (
                  <span className="text-[11px] text-gray-400 line-through">
                    {formatPrice(product.compareAtPrice!)}
                  </span>
                )}
              </div>

              {product.inStock ? (
                <button
                  onClick={() => addItem({ productId: product.id, quantity: 1 }, { openDrawer: false })}
                  className="flex items-center justify-center gap-1 w-full rounded-lg bg-primary py-1.5 text-[11px] font-medium text-white hover:bg-primary/90 transition-colors"
                >
                  <ShoppingCart className="w-3 h-3" />
                  Add to Cart
                </button>
              ) : (
                <span className="block text-center text-[11px] text-red-500 font-medium py-1.5">
                  Out of Stock
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
