export interface CartItem {
  id: string;
  quantity: number;
  [key: string]: unknown;
}

declare global {
  var cartStore: Record<string, CartItem[]>;
  var orderStore: Record<string, OrderRecord[]>;
  var nftClaimStore: Record<string, { claimedAt: string; chainId: number; walletAddress: string; txHash: string; tokenId?: string; metadataIpfsUrl?: string }>;
  var cryptoCheckoutStore: Record<string, CryptoCheckoutRecord>;
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
  metadata?: Record<string, unknown>;
};

export type OrderRecord = {
  id: string;
  createdAt: string;
  status: 'submitted';
  stripeSessionId?: string;
  printifyOrderId?: string;
  total?: number;
  quantumVerified?: boolean;
  quantumRefunded?: boolean;
  quantumProof?: {
    provider: 'ibm';
    jobId: string;
    backend: string;
    seed: string;
    shots?: number;
    createdAt: string;
  };
  items: OrderLineItem[];
};

if (!global.orderStore) {
  global.orderStore = {};
}

if (!global.nftClaimStore) {
  global.nftClaimStore = {};
}

export type CryptoCheckoutRecord = {
  id: string;
  createdAt: string;
  status: 'pending' | 'confirmed';
  deviceId: string;
  userId?: string;
  amountUsd: number;
  chainId: number;
  tokenId: string;
  tokenSymbol: string;
  tokenKind: 'native' | 'erc20' | 'btc';
  tokenAddress?: string;
  tokenDecimals: number;
  expectedAmount: string;
  expectedAmountAtomic: string;
  receiveAddress: string;
  txHash?: string;
  printifyOrderId?: string;
  shipping: {
    customerName: string;
    email: string;
    phone: string;
    country: string;
    region: string;
    address1: string;
    address2?: string;
    city: string;
    zip: string;
    shippingOptionId?: string;
  };
  items: CartItem[];
};

if (!global.cryptoCheckoutStore) {
  global.cryptoCheckoutStore = {};
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

export const findOrderByStripeSessionId = (stripeSessionId: string): { key: string; order: OrderRecord } | null => {
  const sid = String(stripeSessionId || '').trim();
  if (!sid) return null;
  const stores = global.orderStore || {};
  for (const key of Object.keys(stores)) {
    const orders = stores[key] || [];
    const match = orders.find((o) => typeof o?.stripeSessionId === 'string' && o.stripeSessionId === sid);
    if (match) return { key, order: match };
  }
  return null;
};

export const getNftClaim = (stripeSessionId: string) => {
  const sid = String(stripeSessionId || '').trim();
  if (!sid) return null;
  return global.nftClaimStore[sid] || null;
};

export const setNftClaim = (
  stripeSessionId: string,
  value: { claimedAt: string; chainId: number; walletAddress: string; txHash: string; tokenId?: string; metadataIpfsUrl?: string },
) => {
  const sid = String(stripeSessionId || '').trim();
  if (!sid) return;
  global.nftClaimStore[sid] = value;
};

export const getCryptoCheckout = (id: string) => {
  const cid = String(id || '').trim();
  if (!cid) return null;
  return global.cryptoCheckoutStore[cid] || null;
};

export const setCryptoCheckout = (checkout: CryptoCheckoutRecord) => {
  const cid = String(checkout?.id || '').trim();
  if (!cid) return;
  global.cryptoCheckoutStore[cid] = checkout;
};
