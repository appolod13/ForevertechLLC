'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchWithRetry } from '../lib/integrations/http';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const API_BASE = process.env.NEXT_PUBLIC_CART_API_BASE || 'http://localhost:3001';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSuccessResponse(value: unknown): value is { success: boolean } {
  return isRecord(value) && typeof value.success === 'boolean';
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

  useEffect(() => {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = generateUUID();
      localStorage.setItem('device_id', id);
    }
    setDeviceId(id);
  }, []);

  const fetchCart = useCallback(async () => {
    if (!deviceId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.id) params.append('userId', user.id);
      params.append('deviceId', deviceId);
      const res = await fetch(`${API_BASE}/api/cart?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, deviceId]);

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
    try {
      const payload = { item, userId: user?.id, deviceId };
      const res = await fetchWithRetry(`${API_BASE}/api/cart/add`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload
      });
      if (isSuccessResponse(res) && res.success) {
        fetchCart();
        try { localStorage.setItem('cart_sync', String(Date.now())); } catch {}
      } else {
        fetchCart();
        try { localStorage.setItem('cart_sync', String(Date.now())); } catch {}
      }
    } catch (error) {
      console.error('Add to cart failed:', error);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const payload = { itemId, userId: user?.id, deviceId };
      const res = await fetchWithRetry(`${API_BASE}/api/cart/remove`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload
      });
      if (isSuccessResponse(res) && res.success) {
        fetchCart();
        try { localStorage.setItem('cart_sync', String(Date.now())); } catch {}
      }
    } catch (error) {
      console.error('Remove from cart failed:', error);
    }
  };

  const clearCart = async () => {
    try {
      const payload = { userId: user?.id, deviceId };
      const res = await fetchWithRetry(`${API_BASE}/api/cart/clear`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload
      });
      if (isSuccessResponse(res) && res.success) {
        setItems([]);
        try { localStorage.setItem('cart_sync', String(Date.now())); } catch {}
      }
    } catch (error) {
      console.error('Clear cart failed:', error);
    }
  };

  const total = items.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const removePurchasedItems = async (itemIds: string[]) => {
    try {
      for (const itemId of itemIds) {
        const payload = { itemId, userId: user?.id, deviceId };
        const res = await fetchWithRetry(`${API_BASE}/api/cart/remove`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload
        });
        if (!(isSuccessResponse(res) && res.success)) {
          console.error('Remove purchased item failed:', itemId);
        }
      }
      await fetchCart();
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
