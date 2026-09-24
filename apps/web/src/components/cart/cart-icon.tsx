'use client';

import { useCart } from '@/hooks/use-cart';

/**
 * Shopping cart icon with an animated item count badge.
 *
 * Displays a shopping bag icon with a red badge showing the number
 * of items in the cart. The badge animates with a scale-bounce
 * effect when the count changes.
 *
 * Clicking the icon toggles the cart drawer.
 */
export function CartIcon() {
  const { itemCount, toggleCart, isLoading } = useCart();

  return (
    <button
      type="button"
      className="btn-icon relative border border-foreground/[0.05] bg-card text-gray-800 shadow-sm hover:bg-gray-50"
      onClick={toggleCart}
      aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} items` : ''}`}
    >
      {/* Shopping bag icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>

      {/* Animated badge */}
      {!isLoading && itemCount > 0 && (
        <span
          className="animate-cart-badge absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-lg border-2 border-card bg-primary px-1 text-[10px] font-black text-white shadow-sm"
          key={itemCount} // Re-trigger animation when count changes
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}

      {/* Tailwind custom animation via inline style (fallback) */}
      <style jsx>{`
        @keyframes cart-badge-bounce {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-cart-badge {
          animation: cart-badge-bounce 0.3s ease-out;
        }
      `}</style>
    </button>
  );
}
