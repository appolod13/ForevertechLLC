'use client';

import { LiveStatusProvider } from '@/context/LiveStatusContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const showLive = !(pathname === '/checkout' || pathname.startsWith('/checkout/'));

  useEffect(() => {
    const shouldReloadForError = (value: unknown) => {
      const message =
        typeof value === 'string'
          ? value
          : value && typeof value === 'object' && 'message' in value && typeof (value as { message?: unknown }).message === 'string'
            ? (value as { message: string }).message
            : '';
      if (!message) return false;
      return (
        message.includes('ChunkLoadError') ||
        message.includes('Failed to load chunk') ||
        message.includes('Loading chunk') ||
        message.includes('CSS_CHUNK_LOAD_FAILED')
      );
    };

    const reloadOnce = () => {
      try {
        const key = 'ft_chunk_reload_attempted';
        if (sessionStorage.getItem(key) === '1') return;
        sessionStorage.setItem(key, '1');
        const url = new URL(window.location.href);
        url.searchParams.set('__reload', String(Date.now()));
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    };

    const onError = (event: Event) => {
      const e = event as ErrorEvent;
      if (shouldReloadForError(e?.error) || shouldReloadForError(e?.message)) reloadOnce();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (shouldReloadForError(event.reason)) reloadOnce();
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        {showLive ? (
          <LiveStatusProvider>
            {children}
            <Toaster theme="dark" position="bottom-right" />
          </LiveStatusProvider>
        ) : (
          <>
            {children}
            <Toaster theme="dark" position="bottom-right" />
          </>
        )}
      </CartProvider>
    </AuthProvider>
  );
}
