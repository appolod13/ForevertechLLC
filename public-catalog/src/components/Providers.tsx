'use client';

import { LiveStatusProvider } from '@/context/LiveStatusContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <LiveStatusProvider>
          {children}
          <Toaster theme="dark" position="bottom-right" />
        </LiveStatusProvider>
      </CartProvider>
    </AuthProvider>
  );
}
