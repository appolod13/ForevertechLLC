export type CartItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  description?: string;
  currency?: "usd" | "fc";
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type Cart = { items: CartItem[]; updatedAt: number };

const carts = new Map<string, Cart>();

function keyFor(userId: string | null, deviceId: string) {
  return `${userId || "anon"}:${deviceId}`;
}

export function getCart(params: { userId: string | null; deviceId: string }) {
  const key = keyFor(params.userId, params.deviceId);
  return carts.get(key) || { items: [], updatedAt: Date.now() };
}

export function setCart(params: { userId: string | null; deviceId: string; items: CartItem[] }) {
  const key = keyFor(params.userId, params.deviceId);
  const cart = { items: params.items, updatedAt: Date.now() };
  carts.set(key, cart);
  return cart;
}

