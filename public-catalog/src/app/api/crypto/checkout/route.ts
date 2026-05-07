import { NextResponse } from "next/server";
import { quoteShipping } from "@/lib/shippingConfig";
import { getQuantumStatus } from "@/lib/quantumVerified";
import { getCart, setCryptoCheckout, type CartItem, type CryptoCheckoutRecord } from "@/lib/cartStore";
import { getCryptoConfig, type CryptoPaymentToken } from "@/lib/cryptoConfig";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(v: unknown, maxLen = 300): string {
  const s = typeof v === "string" ? v : "";
  const t = s.trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function getNumber(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : NaN;
}

function normalizeCustomerQrUrl(input: unknown): string {
  const raw = getString(input, 400);
  if (!raw) return "";
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return "";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return "";
  const href = u.toString();
  return href.length > 350 ? href.slice(0, 350) : href;
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

function newId(): string {
  return (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`).slice(0, 48);
}

function resolveUnitAmountCents(item: unknown): number | null {
  const rec = isRecord(item) ? item : {};
  const meta = isRecord(rec.metadata) ? (rec.metadata as Record<string, unknown>) : {};
  const productId = getString(meta.productId, 64) || getString(rec.productId, 64);
  if (productId === "tee") return 4999;
  return null;
}

type PriceCache = { ts: number; byId: Record<string, number> };

declare global {
  var __ftCoingeckoPriceCache: PriceCache | undefined;
}

function getPriceCache(): PriceCache {
  if (!global.__ftCoingeckoPriceCache) global.__ftCoingeckoPriceCache = { ts: 0, byId: {} };
  return global.__ftCoingeckoPriceCache;
}

async function fetchUsdPrice(coingeckoId: string): Promise<number> {
  const id = String(coingeckoId || "").trim().toLowerCase();
  if (!id) return NaN;

  const cache = getPriceCache();
  const now = Date.now();
  if (now - cache.ts < 60_000 && Number.isFinite(cache.byId[id])) {
    return cache.byId[id]!;
  }

  const u = new URL("https://api.coingecko.com/api/v3/simple/price");
  u.searchParams.set("ids", id);
  u.searchParams.set("vs_currencies", "usd");
  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) return NaN;
  const json: unknown = await res.json().catch(() => null);
  const rec = isRecord(json) ? (json as Record<string, unknown>) : {};
  const item = isRecord(rec[id]) ? (rec[id] as Record<string, unknown>) : {};
  const price = typeof item.usd === "number" ? item.usd : Number(item.usd || NaN);
  if (!Number.isFinite(price) || price <= 0) return NaN;

  cache.ts = now;
  cache.byId[id] = price;
  return price;
}

function atomicFromAmount(amount: number, decimals: number): bigint {
  const d = Math.max(0, Math.min(36, Math.trunc(decimals)));
  const factor = 10 ** Math.min(d, 15);
  const scaled = Math.ceil(amount * factor);
  const big = BigInt(Math.max(0, scaled));
  const extra = BigInt(10) ** BigInt(d - Math.min(d, 15));
  return big * extra;
}

function formatAmount(atomic: bigint, decimals: number): string {
  const d = Math.max(0, Math.min(36, Math.trunc(decimals)));
  const s = atomic.toString();
  if (d === 0) return s;
  const pad = s.padStart(d + 1, "0");
  const whole = pad.slice(0, -d);
  const frac = pad.slice(-d).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

function buildPaymentUri(token: CryptoPaymentToken, chainId: number, to: string, atomic: bigint): string {
  if (token.kind === "btc") {
    const amountBtc = formatAmount(atomic, 8);
    const params = amountBtc ? `?amount=${encodeURIComponent(amountBtc)}` : "";
    return `bitcoin:${to}${params}`;
  }

  const amount = atomic.toString();
  const chainPart = `@${String(chainId)}`;
  if (token.kind === "native") {
    return `ethereum:${to}${chainPart}?value=${encodeURIComponent(amount)}`;
  }
  const tokenAddr = token.address;
  return `ethereum:${tokenAddr}${chainPart}/transfer?address=${encodeURIComponent(to)}&uint256=${encodeURIComponent(amount)}`;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({} as unknown));
    const b = isRecord(body) ? body : {};

    const deviceId = getString(b.deviceId, 128) || "anonymous";
    const userId = getString(b.userId, 128);
    const quantumVerified = Boolean(b.quantumVerified);
    const tokenId = getString(b.tokenId, 128);
    const customerName = getString(b.customerName);
    const customerEmail = getString(b.customerEmail);
    const shippingOptionId = getString(b.shippingOptionId, 64);
    const shippingCountry = getString(b.shippingCountry, 4);
    const metadata = isRecord(b.metadata) ? (b.metadata as Record<string, unknown>) : {};
    const qrUrlRaw = "qrUrl" in b ? (b as Record<string, unknown>).qrUrl : "";
    const qrUrl = normalizeCustomerQrUrl(qrUrlRaw);
    if (getString(qrUrlRaw) && !qrUrl) {
      return NextResponse.json({ success: false, error: "invalid_qr_url" }, { status: 400 });
    }

    const cartItems = getCart(deviceId);
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ success: false, error: "cart_empty" }, { status: 400 });
    }

    if (quantumVerified) {
      const status = getQuantumStatus();
      if (!status.available) {
        return NextResponse.json({ success: false, error: "quantum_unavailable" }, { status: 400 });
      }
    }

    const cfg = getCryptoConfig();
    if (!cfg.payments?.enabled) {
      return NextResponse.json({ success: false, error: "crypto_payments_disabled" }, { status: 400 });
    }

    const token = cfg.payments.tokens.find((t) => t.enabled && t.id === tokenId) || null;
    if (!token) {
      return NextResponse.json({ success: false, error: "unsupported_token" }, { status: 400 });
    }

    const receive = cfg.payments.receiveAddresses.find((x) => x.chainId === token.chainId) || null;
    const receiveAddress = receive?.address || "";
    const okReceive = token.kind === "btc" ? isBitcoinAddress(receiveAddress) : isEvmAddress(receiveAddress);
    if (!okReceive) {
      return NextResponse.json({ success: false, error: "missing_receive_address" }, { status: 400 });
    }

    const itemCount = cartItems.reduce((sum: number, it: unknown) => {
      const rec = isRecord(it) ? it : {};
      const q = typeof rec.quantity === "number" || typeof rec.quantity === "string" ? Number(rec.quantity) : 1;
      return sum + Math.max(1, Math.trunc(Number.isFinite(q) ? q : 1));
    }, 0);

    const shipCountry =
      shippingCountry ||
      (typeof metadata.country === "string" && metadata.country.trim() ? String(metadata.country) : "") ||
      "US";
    const shipOptions = quoteShipping({ country: String(shipCountry || "US"), itemCount });
    const selectedShip = shipOptions.find((o) => o.id === String(shippingOptionId || "")) || shipOptions[0] || null;
    const shippingUsd = selectedShip ? Number(selectedShip.amountUsd || 0) : 0;

    const itemsUsd = cartItems.reduce((sum: number, it: unknown) => {
      const unitCents = resolveUnitAmountCents(it);
      if (unitCents === null) throw new Error("invalid_product");
      const rec = isRecord(it) ? it : {};
      const q = Math.max(1, Math.trunc(getNumber(rec.quantity) || 1));
      return sum + (unitCents / 100) * q;
    }, 0);

    const feeEnv = (process.env.QUANTUM_VERIFIED_FEE_CENTS || "").trim();
    const feeCentsRaw = feeEnv ? Number(feeEnv) : 499;
    const quantumFeeUsd = quantumVerified ? (Number.isFinite(feeCentsRaw) ? Math.max(0, Math.min(50_000, Math.trunc(feeCentsRaw))) : 499) / 100 : 0;

    const amountUsd = Math.max(0, itemsUsd + (Number.isFinite(shippingUsd) ? shippingUsd : 0) + quantumFeeUsd);

    const isUsdPegged = token.coingeckoId === "usd-coin" || token.coingeckoId === "tether" || token.coingeckoId === "dai";
    let priceUsd = 1;
    if (!isUsdPegged) {
      priceUsd = await fetchUsdPrice(token.coingeckoId);
      if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
        return NextResponse.json({ success: false, error: "token_price_unavailable" }, { status: 400 });
      }
    }

    const amountToken = isUsdPegged ? amountUsd : amountUsd / priceUsd;
    const atomic = atomicFromAmount(amountToken, token.decimals);
    const amountStr = formatAmount(atomic, token.decimals);
    const paymentUri = buildPaymentUri(token, token.chainId, receiveAddress, atomic);

    const checkoutId = newId();
    const shipping = {
      customerName,
      email: customerEmail,
      phone: getString(metadata.phone, 64),
      country: String(metadata.country || shipCountry || "US"),
      region: getString(metadata.region, 64),
      address1: getString(metadata.address, 200),
      address2: getString(metadata.address2, 200) || undefined,
      city: getString(metadata.city, 80),
      zip: getString(metadata.zip, 24),
      shippingOptionId: selectedShip?.id || "",
    };

    const record: CryptoCheckoutRecord = {
      id: checkoutId,
      createdAt: new Date().toISOString(),
      status: "pending",
      deviceId,
      userId: userId || undefined,
      qrUrl: qrUrl || undefined,
      amountUsd,
      chainId: token.chainId,
      tokenId: token.id,
      tokenSymbol: token.symbol,
      tokenKind: token.kind,
      tokenAddress: token.kind === "erc20" ? token.address : undefined,
      tokenDecimals: token.decimals,
      expectedAmount: amountStr,
      expectedAmountAtomic: atomic.toString(),
      receiveAddress,
      shipping,
      items: (cartItems as CartItem[]).map((x) => ({ ...(isRecord(x) ? x : {}) })) as CartItem[],
    };
    setCryptoCheckout(record);

    return NextResponse.json(
      {
        success: true,
        data: {
          checkoutId,
          amountUsd,
          chainId: token.chainId,
          token: {
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            kind: token.kind,
            decimals: token.decimals,
            address: token.kind === "erc20" ? token.address : "",
          },
          receiveAddress,
          amount: amountStr,
          amountAtomic: atomic.toString(),
          paymentUri,
          confirmations: cfg.payments.confirmations,
        },
      },
      { status: 200 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
