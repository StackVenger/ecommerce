'use client';

import { Toaster } from 'sonner';

import { AuthProvider } from './auth-provider';
import { CartProvider } from './cart-provider';

import type { ReactNode } from 'react';

import { CartDrawer } from '@/components/cart/cart-drawer';
import { useColorMode } from '@/lib/theme/color-mode';
// import { ChatWidget } from '@/components/chat'; // temporarily hidden — re-enable to bring back the Shopping Assistant launcher

export function Providers({ children }: { children: ReactNode }) {
  const { resolved } = useColorMode();

  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <CartDrawer />
        {/* <ChatWidget /> */}
        <Toaster position="top-right" theme={resolved} richColors closeButton duration={3000} />
      </CartProvider>
    </AuthProvider>
  );
}
