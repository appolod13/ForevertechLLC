export type ChainConfig = {
  id: string;
  name: string;
  chainId: number;
  enabled: boolean;
  gaslessClaim: boolean;
  contractAddress: string;
  mintFunction: string;
};

export type CryptoPaymentToken = {
  id: string;
  enabled: boolean;
  chainId: number;
  symbol: string;
  name: string;
  kind: "native" | "erc20" | "btc";
  address: string;
  decimals: number;
  coingeckoId: string;
};

export type CryptoPaymentsConfig = {
  enabled: boolean;
  confirmations: number;
  receiveAddresses: Array<{ chainId: number; address: string }>;
  tokens: CryptoPaymentToken[];
};

export type CryptoConfig = {
  version: string;
  primaryChainId: number;
  chains: ChainConfig[];
  payments: CryptoPaymentsConfig;
};

type PartialDeep<T> = { [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function asInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function isEvmAddress(v: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

function isBitcoinAddress(v: string): boolean {
  const s = String(v || "").trim();
  if (!s) return false;
  if (/^bc1[ac-hj-np-z02-9]{11,71}$/i.test(s)) return true;
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(s)) return true;
  return false;
}

function normalizeAddress(v: unknown): string {
  const s = asNonEmptyString(v) || "";
  return isEvmAddress(s) ? s : "";
}

function normalizeBitcoinAddress(v: unknown): string {
  const s = asNonEmptyString(v) || "";
  return isBitcoinAddress(s) ? s : "";
}

function clampConfirmations(v: unknown, fallback: number): number {
  const n = asInt(v);
  if (n === null) return fallback;
  if (n < 0) return 0;
  if (n > 64) return 64;
  return n;
}

function clampDecimals(v: unknown, fallback: number): number {
  const n = asInt(v);
  if (n === null) return fallback;
  if (n < 0) return 0;
  if (n > 36) return 36;
  return n;
}

function sanitizeSymbol(v: unknown, fallback: string): string {
  const s = (asNonEmptyString(v) || fallback).toUpperCase();
  return s.replace(/[^A-Z0-9]/g, "").slice(0, 12) || fallback;
}

function sanitizeName(v: unknown, fallback: string): string {
  const s = asNonEmptyString(v) || fallback;
  return s.slice(0, 64) || fallback;
}

function sanitizeCoingeckoId(v: unknown, fallback: string): string {
  const s = (asNonEmptyString(v) || fallback).toLowerCase();
  return s.replace(/[^a-z0-9-]/g, "").slice(0, 64) || fallback;
}

function clampChainId(v: unknown, fallback: number): number {
  const n = asInt(v);
  if (n === null) return fallback;
  if (n < 1) return 1;
  if (n > 1_000_000) return 1_000_000;
  return n;
}

function newId(): string {
  return (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`).slice(0, 48);
}

function defaultConfig(): CryptoConfig {
  const bnbAddress = (process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "").trim();
  const bnbMintFn = (process.env.NEXT_PUBLIC_NFT_MINT_FUNCTION || "safeMint").trim() || "safeMint";

  const chains: ChainConfig[] = [
    {
      id: "bnb",
      name: "BNB Chain",
      chainId: 56,
      enabled: true,
      gaslessClaim: true,
      contractAddress: isEvmAddress(bnbAddress) ? bnbAddress : "",
      mintFunction: bnbMintFn,
    },
    {
      id: "base",
      name: "Base",
      chainId: 8453,
      enabled: true,
      gaslessClaim: false,
      contractAddress: "",
      mintFunction: "safeMint",
    },
  ];

  const defaultReceive = (process.env.NEXT_PUBLIC_CRYPTO_RECEIVE_ADDRESS || "").trim();
  const receiveAddresses = [
    { chainId: 56, address: normalizeAddress(process.env.NEXT_PUBLIC_CRYPTO_RECEIVE_ADDRESS_56 || defaultReceive) },
    { chainId: 1, address: normalizeAddress(process.env.NEXT_PUBLIC_CRYPTO_RECEIVE_ADDRESS_1 || defaultReceive) },
    { chainId: 8453, address: normalizeAddress(process.env.NEXT_PUBLIC_CRYPTO_RECEIVE_ADDRESS_8453 || defaultReceive) },
    { chainId: 100000, address: normalizeBitcoinAddress(process.env.NEXT_PUBLIC_CRYPTO_RECEIVE_ADDRESS_100000 || process.env.NEXT_PUBLIC_CRYPTO_RECEIVE_ADDRESS_BTC || "") },
  ].filter((x) => x.address);

  const tokens: CryptoPaymentToken[] = [
    { id: "btc-100000", enabled: true, chainId: 100000, symbol: "BTC", name: "Bitcoin", kind: "btc", address: "", decimals: 8, coingeckoId: "bitcoin" },
    { id: "eth-native-1", enabled: true, chainId: 1, symbol: "ETH", name: "Ether", kind: "native", address: "", decimals: 18, coingeckoId: "ethereum" },
    { id: "usdc-1", enabled: true, chainId: 1, symbol: "USDC", name: "USD Coin", kind: "erc20", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, coingeckoId: "usd-coin" },
    { id: "usdt-1", enabled: true, chainId: 1, symbol: "USDT", name: "Tether USD", kind: "erc20", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, coingeckoId: "tether" },
    { id: "dai-1", enabled: true, chainId: 1, symbol: "DAI", name: "Dai", kind: "erc20", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, coingeckoId: "dai" },
    { id: "bnb-native-56", enabled: true, chainId: 56, symbol: "BNB", name: "BNB", kind: "native", address: "", decimals: 18, coingeckoId: "binancecoin" },
    { id: "usdt-56", enabled: true, chainId: 56, symbol: "USDT", name: "Tether USD (BEP20)", kind: "erc20", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, coingeckoId: "tether" },
    { id: "usdc-56", enabled: true, chainId: 56, symbol: "USDC", name: "USD Coin (BEP20)", kind: "erc20", address: "0x8AC76a51cc950d9822D68b83fe1Ad97B32Cd580d", decimals: 18, coingeckoId: "usd-coin" },
    { id: "eth-native-8453", enabled: true, chainId: 8453, symbol: "ETH", name: "Ether (Base)", kind: "native", address: "", decimals: 18, coingeckoId: "ethereum" },
    { id: "usdc-8453", enabled: true, chainId: 8453, symbol: "USDC", name: "USD Coin (Base)", kind: "erc20", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, coingeckoId: "usd-coin" },
  ];

  const payments: CryptoPaymentsConfig = {
    enabled: true,
    confirmations: 1,
    receiveAddresses,
    tokens,
  };

  return { version: Date.now().toString(36), primaryChainId: 56, chains, payments };
}

function getStore(): CryptoConfig {
  const g = globalThis as unknown as { __ftCryptoConfig?: CryptoConfig };
  if (!g.__ftCryptoConfig) {
    g.__ftCryptoConfig = defaultConfig();
    return g.__ftCryptoConfig;
  }

  const cur = g.__ftCryptoConfig;
  const next = { ...cur };

  if (!next.payments || !Array.isArray(next.payments.tokens) || !Array.isArray(next.payments.receiveAddresses)) {
    const def = defaultConfig();
    g.__ftCryptoConfig = def;
    return def;
  }

  const hasBtc = next.payments.tokens.some((t) => t && (t.coingeckoId === "bitcoin" || t.symbol === "BTC" || t.id === "btc-100000"));
  if (!hasBtc) {
    next.payments = {
      ...next.payments,
      tokens: [
        { id: "btc-100000", enabled: true, chainId: 100000, symbol: "BTC", name: "Bitcoin", kind: "btc", address: "", decimals: 8, coingeckoId: "bitcoin" },
        ...next.payments.tokens,
      ],
    };
    next.version = Date.now().toString(36);
    g.__ftCryptoConfig = next;
    return next;
  }

  return cur;
}

function setStore(next: CryptoConfig) {
  const g = globalThis as unknown as { __ftCryptoConfig?: CryptoConfig };
  g.__ftCryptoConfig = next;
}

function sanitizeChain(input: unknown, fallback?: ChainConfig): ChainConfig {
  const base =
    fallback ||
    ({
      id: newId(),
      name: "Chain",
      chainId: 56,
      enabled: false,
      gaslessClaim: false,
      contractAddress: "",
      mintFunction: "safeMint",
    } satisfies ChainConfig);

  const rec = isRecord(input) ? input : {};

  const id = asNonEmptyString(rec.id) || base.id;
  const name = asNonEmptyString(rec.name) || base.name;
  const chainId = clampChainId(rec.chainId, base.chainId);
  const enabled = typeof rec.enabled === "boolean" ? rec.enabled : base.enabled;
  const gaslessClaim = typeof rec.gaslessClaim === "boolean" ? rec.gaslessClaim : base.gaslessClaim;
  const contractAddress = normalizeAddress(rec.contractAddress) || base.contractAddress;
  const mintFunction = asNonEmptyString(rec.mintFunction) || base.mintFunction;
  return { id, name, chainId, enabled, gaslessClaim, contractAddress, mintFunction };
}

function sanitizePaymentsToken(input: unknown, fallback?: CryptoPaymentToken): CryptoPaymentToken {
  const base =
    fallback ||
    ({
      id: newId(),
      enabled: false,
      chainId: 1,
      symbol: "TOKEN",
      name: "Token",
      kind: "erc20",
      address: "",
      decimals: 18,
      coingeckoId: "token",
    } satisfies CryptoPaymentToken);

  const rec = isRecord(input) ? input : {};
  const id = asNonEmptyString(rec.id) || base.id;
  const enabled = typeof rec.enabled === "boolean" ? rec.enabled : base.enabled;
  const chainId = clampChainId(rec.chainId, base.chainId);
  const symbol = sanitizeSymbol(rec.symbol, base.symbol);
  const name = sanitizeName(rec.name, base.name);
  const kindRaw = asNonEmptyString(rec.kind) || base.kind;
  const kind = kindRaw === "btc" ? "btc" : kindRaw === "native" ? "native" : "erc20";
  const address = kind === "erc20" ? normalizeAddress(rec.address) || base.address : "";
  const decimals = kind === "btc" ? 8 : clampDecimals(rec.decimals, base.decimals);
  const coingeckoId = sanitizeCoingeckoId(rec.coingeckoId, base.coingeckoId);
  return { id, enabled, chainId, symbol, name, kind, address, decimals, coingeckoId };
}

function sanitizeReceiveAddress(input: unknown): { chainId: number; address: string } | null {
  const rec = isRecord(input) ? input : {};
  const chainId = clampChainId(rec.chainId, 1);
  const address = chainId === 100000 ? normalizeBitcoinAddress(rec.address) : normalizeAddress(rec.address);
  if (!address) return null;
  return { chainId, address };
}

function sanitizePayments(input: unknown, fallback?: CryptoPaymentsConfig): CryptoPaymentsConfig {
  const base =
    fallback ||
    ({
      enabled: false,
      confirmations: 1,
      receiveAddresses: [],
      tokens: [],
    } satisfies CryptoPaymentsConfig);

  const rec = isRecord(input) ? input : {};
  const enabled = typeof rec.enabled === "boolean" ? rec.enabled : base.enabled;
  const confirmations = clampConfirmations(rec.confirmations, base.confirmations);

  const raIn = Array.isArray(rec.receiveAddresses) ? rec.receiveAddresses : null;
  const receiveAddresses = (raIn ? raIn : base.receiveAddresses)
    .map((x) => sanitizeReceiveAddress(x))
    .filter((x): x is { chainId: number; address: string } => Boolean(x));

  const tokensIn = Array.isArray(rec.tokens) ? rec.tokens : null;
  const tokens = tokensIn ? tokensIn.map((t, idx: number) => sanitizePaymentsToken(t, base.tokens[idx])) : base.tokens.map((t) => sanitizePaymentsToken(t, t));

  const byId = new Set<string>();
  const uniqTokens: CryptoPaymentToken[] = [];
  for (const t of tokens) {
    const key = t.id || newId();
    if (byId.has(key)) continue;
    byId.add(key);
    uniqTokens.push({ ...t, id: key });
  }

  return { enabled, confirmations, receiveAddresses, tokens: uniqTokens };
}

export function getCryptoConfig(): CryptoConfig {
  return getStore();
}

export function updateCryptoConfig(patch: PartialDeep<CryptoConfig>): CryptoConfig {
  const cur = getStore();
  const primaryChainId = clampChainId(patch.primaryChainId, cur.primaryChainId);

  const chainsIn = Array.isArray(patch.chains) ? patch.chains : null;
  const chains = chainsIn ? chainsIn.map((c, idx: number) => sanitizeChain(c, cur.chains[idx])) : cur.chains.map((c) => sanitizeChain(c, c));

  const byId = new Set<string>();
  const uniqueChains: ChainConfig[] = [];
  for (const c of chains) {
    const key = c.id || newId();
    if (byId.has(key)) continue;
    byId.add(key);
    uniqueChains.push({ ...c, id: key });
  }

  const payments = sanitizePayments((patch as PartialDeep<CryptoConfig> as { payments?: unknown }).payments, cur.payments);

  const next: CryptoConfig = { version: Date.now().toString(36), primaryChainId, chains: uniqueChains, payments };
  setStore(next);
  return next;
}

export type CryptoConfigPatch = PartialDeep<CryptoConfig>;
