export type ChainConfig = {
  id: string;
  name: string;
  chainId: number;
  enabled: boolean;
  gaslessClaim: boolean;
  contractAddress: string;
  mintFunction: string;
};

export type CryptoConfig = {
  version: string;
  primaryChainId: number;
  chains: ChainConfig[];
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

function normalizeAddress(v: unknown): string {
  const s = asNonEmptyString(v) || "";
  return isEvmAddress(s) ? s : "";
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

  return { version: Date.now().toString(36), primaryChainId: 56, chains };
}

function getStore(): CryptoConfig {
  const g = globalThis as unknown as { __ftCryptoConfig?: CryptoConfig };
  if (!g.__ftCryptoConfig) g.__ftCryptoConfig = defaultConfig();
  return g.__ftCryptoConfig;
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

  const next: CryptoConfig = { version: Date.now().toString(36), primaryChainId, chains: uniqueChains };
  setStore(next);
  return next;
}

export type CryptoConfigPatch = PartialDeep<CryptoConfig>;
