'use client';

import type { ChatProductCard } from '@/lib/api/chat';

import { ProductCard } from '@/components/products/product-card';
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
  const { cart, addItem } = useCart();

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
      {products.map((product) => {
        const isAlreadyInCart = cart?.items?.some((item) => item.productId === product.id);
        const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
        const discountPercent = hasDiscount
          ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
          : 0;

        return (
          <ProductCard
            key={product.slug}
            size="compact"
            className="w-44 flex-shrink-0"
            href={`/products/${product.slug}`}
            name={product.name}
            image={product.image}
            rating={product.averageRating > 0 ? product.averageRating : null}
            reviewCount={product.totalReviews}
            price={product.price}
            originalPrice={hasDiscount ? product.compareAtPrice : null}
            formatPrice={formatPrice}
            badges={hasDiscount ? [{ label: `-${discountPercent}%`, tone: 'sale' }] : []}
            outOfStock={!product.inStock}
            inCart={isAlreadyInCart}
            onAddToCart={() =>
              addItem({ productId: product.id, quantity: 1 }, { openDrawer: false })
            }
          />
        );
      })}
    </div>
  );
}
