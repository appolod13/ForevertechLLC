'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { fetchWithRetry } from '../lib/integrations/http';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function normalizeBaseUrl(raw: string) {
  const t = String(raw || '').trim().replace(/\/$/, '');
  return t;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSuccessResponse(value: unknown): value is { success: boolean } {
  return isRecord(value) && typeof value.success === 'boolean';
}

function cartStorageKey(deviceId: string) {
  return `ft_cart_${deviceId || 'anonymous'}`;
}

function inferSize(value: unknown): 'S' | 'M' | 'L' | 'XL' | 'XXL' | undefined {
  const raw = typeof value === 'string' ? value : '';
  const m = raw.match(/\bSize:\s*(S|M|L|XL|XXL)\b/i);
  if (!m) return undefined;
  const s = m[1].toUpperCase();
  if (s === 'S' || s === 'M' || s === 'L' || s === 'XL' || s === 'XXL') return s;
  return undefined;
}

function normalizeCartItem(item: CartItem): CartItem {
  const qty = typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? Math.max(1, Math.trunc(item.quantity)) : 1;
  const size =
    item.size ||
    inferSize(item.title) ||
    inferSize(item.description) ||
    (typeof item.metadata?.variant === 'string' ? (item.metadata.variant as CartItem['size']) : undefined) ||
    undefined;

  const metadata: Record<string, unknown> = item.metadata && isRecord(item.metadata) ? { ...item.metadata } : {};
  if (typeof metadata.productId !== 'string' || !String(metadata.productId || '').trim()) {
    metadata.productId = 'tee';
  }
  if (size && (typeof metadata.variant !== 'string' || !String(metadata.variant || '').trim())) {
    metadata.variant = size;
  }

  return { ...item, quantity: qty, size, metadata };
}

function readStoredCart(deviceId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(cartStorageKey(deviceId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => (isRecord(x) ? (x as CartItem) : null))
      .filter((x): x is CartItem => Boolean(x && typeof x.id === 'string' && x.id))
      .map(normalizeCartItem);
  } catch {
    return [];
  }
}

function writeStoredCart(deviceId: string, items: CartItem[]) {
  try {
    localStorage.setItem(cartStorageKey(deviceId), JSON.stringify(items));
  } catch {}
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  description?: string;
  imageError?: boolean;
  originalPrompt?: string;
  originalFilename?: string;
  currency?: 'usd' | 'fc';
  size?: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CartContextType {
  items: CartItem[];
  total: number;
  isLoading: boolean;
  addToCart: (item: CartItem) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  removePurchasedItems: (itemIds: string[]) => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [deviceId, setDeviceId] = useState<string>('');
  const [hasHydrated, setHasHydrated] = useState(false);

  const apiBase = useMemo(() => {
    const envBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_CART_API_BASE || '');
    if (!envBase) return '';
    if (typeof window === 'undefined') return envBase;
    const origin = window.location.origin;
    if (envBase === origin) return envBase;
    return process.env.NODE_ENV === 'production' ? '' : envBase;
  }, []);

  const apiUrl = useCallback(
    (path: string) => `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`,
    [apiBase],
  );

  useEffect(() => {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = generateUUID();
      localStorage.setItem('device_id', id);
    }
    setDeviceId(id);
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    const stored = readStoredCart(deviceId);
    if (stored.length) setItems(stored);
    setHasHydrated(true);
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    if (!hasHydrated) return;
    writeStoredCart(deviceId, items);
  }, [deviceId, hasHydrated, items]);

  const fetchCart = useCallback(async () => {
    if (!deviceId) return;
    setIsLoading(true);
    try {
      const stored = readStoredCart(deviceId);
      setItems(stored);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      const stored = readStoredCart(deviceId);
      if (stored.length) setItems(stored);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cart_sync') {
        fetchCart();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [fetchCart]);

  const addToCart = async (item: CartItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        const existing = next[idx];
        next[idx] = { ...existing, quantity: (existing.quantity || 1) + (item.quantity || 1) };
        return next;
      }
      return [...prev, item];
    });
    try { localStorage.setItem('cart_sync', String(Date.now())); } catch {}
    try {
      const payload = { item, userId: user?.id, deviceId };
      const res = await fetchWithRetry(apiUrl('/api/cart/add'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload
      });
      if (!(isSuccessResponse(res) && res.success)) throw new Error('cart_add_failed');
    } catch (error) {
      console.error('Add to cart server sync failed:', error);
    }
  };

  const removeFromCart = async (itemId: string) => {
    setItems((prev) => prev.filter((x) => x.id !== itemId));
    try { localStorage.setItem('cart_sync', String(Date.now())); } catch {}
    try {
      const payload = { itemId, userId: user?.id, deviceId };
      const res = await fetchWithRetry(apiUrl('/api/cart/remove'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload
      });
      if (!(isSuccessResponse(res) && res.success)) throw new Error('cart_remove_failed');
    } catch (error) {
      console.error('Remove from cart server sync failed:', error);
    }
  };

  const clearCart = async () => {
    setItems([]);
    try { localStorage.setItem('cart_sync', String(Date.now())); } catch {}
    try {
      const payload = { userId: user?.id, deviceId };
      const res = await fetchWithRetry(apiUrl('/api/cart/clear'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload
      });
      if (!(isSuccessResponse(res) && res.success)) throw new Error('cart_clear_failed');
    } catch (error) {
      console.error('Clear cart server sync failed:', error);
    }
  };

  const total = items.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const removePurchasedItems = async (itemIds: string[]) => {
    try {
      setItems((prev) => prev.filter((x) => !itemIds.includes(x.id)));
      try { localStorage.setItem('cart_sync', String(Date.now())); } catch {}
    } catch (error) {
      console.error('Remove purchased items failed:', error);
    }
  };

  return (
    <CartContext.Provider value={{ items, total, isLoading, addToCart, removeFromCart, clearCart, removePurchasedItems, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
