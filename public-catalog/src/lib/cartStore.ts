export interface CartItem {
  id: string;
  quantity: number;
  [key: string]: unknown;
}

declare global {
  var cartStore: Record<string, CartItem[]>;
  var orderStore: Record<string, OrderRecord[]>;
}

if (!global.cartStore) {
  global.cartStore = {};
}

export type OrderLineItem = {
  id?: string;
  title?: string;
  quantity: number;
  price?: number;
  imageUrl?: string;
};

export type OrderRecord = {
  id: string;
  createdAt: string;
  status: 'submitted';
  stripeSessionId?: string;
  printifyOrderId?: string;
  total?: number;
  items: OrderLineItem[];
};

if (!global.orderStore) {
  global.orderStore = {};
}

export const getCarts = () => global.cartStore;
export const getCart = (deviceId: string) => global.cartStore[deviceId] || [];
export const setCart = (deviceId: string, items: CartItem[]) => {
  global.cartStore[deviceId] = items;
};
export const clearCart = (deviceId: string) => {
  global.cartStore[deviceId] = [];
};

export const getOrders = (key: string) => global.orderStore[key] || [];
export const setOrders = (key: string, orders: OrderRecord[]) => {
  global.orderStore[key] = orders;
};
export const addOrder = (key: string, order: OrderRecord) => {
  const current = global.orderStore[key] || [];
  global.orderStore[key] = [order, ...current].slice(0, 200);
};
