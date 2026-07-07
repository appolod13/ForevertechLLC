import { NextResponse } from "next/server";
import { Interface, JsonRpcProvider } from "ethers";
import { addOrder, clearCart, getCryptoCheckout, setCryptoCheckout, type CartItem, type OrderRecord } from "@/lib/cartStore";
import { getCryptoConfig } from "@/lib/cryptoConfig";
import { expandAopPlacementKeys, resolveTemplateProductIdForItem } from "@/lib/printifyProductMode";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown, maxLen = 500): string {
  const s = typeof v === "string" ? v : "";
  const t = s.trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function getNumber(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : NaN;
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

function normalizeEvmAddress(v: unknown): string {
  const s = getString(v, 100);
  return isEvmAddress(s) ? s : "";
}

function normalizeBitcoinAddress(v: unknown): string {
  const s = getString(v, 120);
  return isBitcoinAddress(s) ? s : "";
}

function resolveRpcUrl(chainId: number): string {
  const env = process.env as Record<string, string | undefined>;
  const byId = (env[`EVM_RPC_URL_${chainId}`] || "").trim();
  if (byId) return byId;
  if (chainId === 56) return (process.env.BNB_RPC_URL || "").trim();
  return "";
}

type PrintifyTemplateVariant = { id: unknown; sku?: unknown };
type PrintifyTemplatePlaceholderImage = { x?: unknown; y?: unknown; scale?: unknown; angle?: unknown };
type PrintifyTemplatePlaceholder = { position?: unknown; images?: unknown };
type PrintifyTemplatePrintArea = { variant_ids?: unknown; placeholders?: unknown };
type PrintifyTemplateProduct = {
  id?: unknown;
  blueprint_id?: unknown;
  print_provider_id?: unknown;
  variants?: unknown;
  print_areas?: unknown;
};

type PrintifyPrintAreaInfo = { src: string; x: number; y: number; scale: number; angle: number };
type PrintifyLineItem = {
  blueprint_id: number;
  print_provider_id: number;
  variant_id: number;
  quantity: number;
  external_id: string;
  print_areas: Record<string, PrintifyPrintAreaInfo[]>;
};

type PrintifyAddressTo = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: string;
  region?: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
};

function splitName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { first: "Customer", last: "Order" };
  if (parts.length === 1) return { first: parts[0]!, last: "Order" };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

async function printifyFetch(path: string, init?: RequestInit) {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    throw new Error("Missing PRINTIFY_API_TOKEN");
  }

  let res: Response;
  try {
    res = await fetch(`https://api.printify.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "public-catalog",
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || "");
    throw new Error(`Printify network error: ${path}${msg ? ` (${msg})` : ""}`);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Printify API error (${res.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function fetchImageAsBase64(url: string) {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || "");
    throw new Error(`Image fetch network error: ${url}${msg ? ` (${msg})` : ""}`);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

async function uploadImageToPrintify(fileName: string, base64Contents: string) {
  const uploaded = await printifyFetch("/v1/uploads/images.json", {
    method: "POST",
    body: JSON.stringify({
      file_name: fileName,
      contents: base64Contents,
    }),
  });

  if (!uploaded || typeof uploaded.preview_url !== "string") {
    throw new Error("Printify upload did not return preview_url");
  }

  return uploaded.preview_url as string;
}

async function getTemplateProduct(shopId: string, preferredProductId?: string) {
  const templateProductId = preferredProductId || process.env.PRINTIFY_TEMPLATE_PRODUCT_ID;
  const resolvedProductId = typeof templateProductId === "string" ? templateProductId.trim() : "";
  if (!resolvedProductId) {
    throw new Error("Missing PRINTIFY_TEMPLATE_PRODUCT_ID");
  }
  const product = (await printifyFetch(`/v1/shops/${shopId}/products/${resolvedProductId}.json`)) as unknown;
  if (!isRecord(product)) {
    throw new Error("Printify template product response was invalid");
  }
  return product as PrintifyTemplateProduct;
}

function getVariantIdFromTemplate(template: PrintifyTemplateProduct, sku: string) {
  const variantsRaw = template.variants;
  if (!Array.isArray(variantsRaw)) {
    throw new Error("Printify template product is missing variants");
  }

  let fallbackVariantId: number | null = null;
  for (const v of variantsRaw as PrintifyTemplateVariant[]) {
    if (!isRecord(v)) continue;
    const vSku = getString((v as Record<string, unknown>).sku);
    const candidateId = getNumber((v as Record<string, unknown>).id);
    if (fallbackVariantId === null && Number.isFinite(candidateId)) {
      fallbackVariantId = candidateId;
    }
    if (vSku && vSku === sku) {
      if (Number.isFinite(candidateId)) return candidateId;
    }
  }

  if (typeof fallbackVariantId === "number" && Number.isFinite(fallbackVariantId)) {
    return fallbackVariantId;
  }

  throw new Error(`Could not find template variant for sku: ${sku}`);
}

function getTransformFromTemplate(template: PrintifyTemplateProduct, variantId: number, placementKey: string) {
  const printAreasRaw = template.print_areas;
  if (!Array.isArray(printAreasRaw)) {
    return { x: 0, y: 0, scale: 1, angle: 0 };
  }

  for (const area of printAreasRaw as PrintifyTemplatePrintArea[]) {
    if (!isRecord(area)) continue;
    const variantIdsRaw = (area as Record<string, unknown>).variant_ids;
    const placeholdersRaw = (area as Record<string, unknown>).placeholders;
    const variantIds = Array.isArray(variantIdsRaw) ? variantIdsRaw.map(getNumber).filter(Number.isFinite) : [];
    if (!variantIds.includes(variantId)) continue;
    if (!Array.isArray(placeholdersRaw)) continue;

    for (const ph of placeholdersRaw as PrintifyTemplatePlaceholder[]) {
      if (!isRecord(ph)) continue;
      const pos = getString((ph as Record<string, unknown>).position);
      if (!pos || pos !== placementKey) continue;
      const imagesRaw = (ph as Record<string, unknown>).images;
      if (!Array.isArray(imagesRaw) || imagesRaw.length === 0) continue;
      const first = imagesRaw[0];
      if (!isRecord(first)) continue;
      const img = first as PrintifyTemplatePlaceholderImage;
      return {
        x: Number.isFinite(getNumber(img.x)) ? getNumber(img.x) : 0,
        y: Number.isFinite(getNumber(img.y)) ? getNumber(img.y) : 0,
        scale: Number.isFinite(getNumber(img.scale)) ? getNumber(img.scale) : 1,
        angle: Number.isFinite(getNumber(img.angle)) ? getNumber(img.angle) : 0,
      };
    }
  }
  return { x: 0, y: 0, scale: 1, angle: 0 };
}

function getPlacementKeysForVariant(template: PrintifyTemplateProduct, variantId: number) {
  const printAreasRaw = template.print_areas;
  if (!Array.isArray(printAreasRaw)) return [];
  const keys: string[] = [];

  for (const area of printAreasRaw as PrintifyTemplatePrintArea[]) {
    if (!isRecord(area)) continue;
    const variantIdsRaw = (area as Record<string, unknown>).variant_ids;
    const placeholdersRaw = (area as Record<string, unknown>).placeholders;
    const variantIds = Array.isArray(variantIdsRaw) ? variantIdsRaw.map(getNumber).filter(Number.isFinite) : [];
    if (!variantIds.includes(variantId)) continue;
    if (!Array.isArray(placeholdersRaw)) continue;

    for (const ph of placeholdersRaw as PrintifyTemplatePlaceholder[]) {
      if (!isRecord(ph)) continue;
      const pos = getString((ph as Record<string, unknown>).position);
      if (pos) keys.push(pos);
    }
  }

  return Array.from(new Set(keys));
}

function buildPrintifyFileName(title: string, id: string) {
  const safeTitle = title.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40) || "design";
  const safeId = id.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 24) || "item";
  return `${safeTitle}_${safeId}.png`;
}

function resolveCartImageUrl(origin: string, item: Record<string, unknown>): string {
  const raw = getString(item.imageUrl) || getString(item.image);
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (!origin) return raw;
  return `${origin}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

function resolveSkuFromCartItem(item: Record<string, unknown>): string {
  const meta = isRecord(item.metadata) ? (item.metadata as Record<string, unknown>) : {};
  const sku = getString(meta.printifySku, 128) || getString(process.env.PRINTIFY_DEFAULT_SKU || "", 128);
  return sku;
}

const TRANSFER_ABI = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
const transferIface = new Interface(TRANSFER_ABI);

export async function POST(req: Request) {
  try {
    if (process.env.ENABLE_CRYPTO_PAYMENTS !== "1") {
      return NextResponse.json({ success: false, error: "disabled" }, { status: 404 });
    }
    const body: unknown = await req.json().catch(() => ({} as unknown));
    const b = isRecord(body) ? body : {};

    const checkoutId = getString(b.checkoutId, 64);
    const txHash = getString(b.txHash, 120);
    if (!checkoutId) return NextResponse.json({ success: false, error: "missing_checkoutId" }, { status: 400 });
    if (!txHash) return NextResponse.json({ success: false, error: "missing_txHash" }, { status: 400 });

    const checkout = getCryptoCheckout(checkoutId);
    if (!checkout) return NextResponse.json({ success: false, error: "unknown_checkout" }, { status: 404 });
    if (checkout.status === "confirmed" && checkout.printifyOrderId) {
      return NextResponse.json({ success: true, data: { confirmed: true, printifyOrderId: checkout.printifyOrderId, txHash: checkout.txHash || txHash } }, { status: 200 });
    }

    const cfg = getCryptoConfig();
    const token = cfg.payments.tokens.find((t) => t.enabled && t.id === checkout.tokenId) || null;
    if (!token) return NextResponse.json({ success: false, error: "unsupported_token" }, { status: 400 });

    const required = Math.max(0, Math.min(64, Math.trunc(cfg.payments.confirmations || 1)));

    if (token.kind === "btc") {
      const receiveBtc = normalizeBitcoinAddress(checkout.receiveAddress);
      if (!receiveBtc) return NextResponse.json({ success: false, error: "missing_receive_address" }, { status: 400 });
      if (!/^[a-fA-F0-9]{64}$/.test(txHash)) return NextResponse.json({ success: false, error: "invalid_txHash" }, { status: 400 });

      const statusRes = await fetch(`https://blockstream.info/api/tx/${encodeURIComponent(txHash)}/status`, { cache: "no-store" });
      if (!statusRes.ok) return NextResponse.json({ success: false, error: "btc_status_unavailable" }, { status: 400 });
      const statusJson: unknown = await statusRes.json().catch(() => null);
      const statusRec = isRecord(statusJson) ? statusJson : {};
      const confirmed = statusRec.confirmed === true;
      const blockHeight = typeof statusRec.block_height === "number" ? statusRec.block_height : Number(statusRec.block_height || NaN);
      if (!confirmed || !Number.isFinite(blockHeight)) {
        return NextResponse.json({ success: true, data: { confirmed: false, status: "pending" } }, { status: 200 });
      }

      const tipRes = await fetch("https://blockstream.info/api/blocks/tip/height", { cache: "no-store" });
      if (!tipRes.ok) return NextResponse.json({ success: false, error: "btc_tip_unavailable" }, { status: 400 });
      const tipText = await tipRes.text();
      const tip = Number(tipText.trim());
      const confirmations = Number.isFinite(tip) ? Math.max(0, tip - blockHeight + 1) : 0;

      if (confirmations < required) {
        return NextResponse.json({ success: true, data: { confirmed: false, status: "confirming", confirmations, required } }, { status: 200 });
      }

      const txRes = await fetch(`https://blockstream.info/api/tx/${encodeURIComponent(txHash)}`, { cache: "no-store" });
      if (!txRes.ok) return NextResponse.json({ success: false, error: "btc_tx_unavailable" }, { status: 400 });
      const txJson: unknown = await txRes.json().catch(() => null);
      const txRec = isRecord(txJson) ? (txJson as Record<string, unknown>) : {};
      const vout = Array.isArray(txRec.vout) ? (txRec.vout as Array<Record<string, unknown>>) : [];

      let paidAtomic = BigInt(0);
      for (const o of vout) {
        const addr = typeof o.scriptpubkey_address === "string" ? o.scriptpubkey_address : "";
        if (!addr || addr !== receiveBtc) continue;
        const value = typeof o.value === "number" ? o.value : Number(o.value || 0);
        if (Number.isFinite(value) && value > 0) {
          paidAtomic += BigInt(Math.trunc(value));
        }
      }

      const expectedAtomic = BigInt(checkout.expectedAmountAtomic || "0");
      if (paidAtomic < expectedAtomic) {
        return NextResponse.json(
          { success: false, error: "insufficient_amount", details: { paidAtomic: paidAtomic.toString(), expectedAtomic: expectedAtomic.toString() } },
          { status: 400 },
        );
      }

      return await finalizePrintifyAndStoreOrder(req, checkoutId, txHash, checkout, required);
    }

    const rpcUrl = resolveRpcUrl(checkout.chainId);
    if (!rpcUrl) return NextResponse.json({ success: false, error: "rpc_not_configured" }, { status: 400 });
    const provider = new JsonRpcProvider(rpcUrl);

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return NextResponse.json({ success: true, data: { confirmed: false, status: "pending" } }, { status: 200 });
    }

    const latest = await provider.getBlockNumber();
    const confirmations = receipt.blockNumber ? Math.max(0, latest - receipt.blockNumber + 1) : 0;
    if (confirmations < required) {
      return NextResponse.json({ success: true, data: { confirmed: false, status: "confirming", confirmations, required } }, { status: 200 });
    }

    const expectedAtomic = BigInt(checkout.expectedAmountAtomic || "0");
    const receive = normalizeEvmAddress(checkout.receiveAddress);
    if (!receive) return NextResponse.json({ success: false, error: "missing_receive_address" }, { status: 400 });

    let paidAtomic = BigInt(0);

    if (token.kind === "native") {
      const tx = await provider.getTransaction(txHash);
      const to = normalizeEvmAddress(tx?.to || "");
      if (!to || to.toLowerCase() !== receive.toLowerCase()) {
        return NextResponse.json({ success: false, error: "wrong_recipient" }, { status: 400 });
      }
      paidAtomic = BigInt(String(tx?.value ?? 0));
    } else {
      const tokenAddress = normalizeEvmAddress(token.address);
      if (!tokenAddress) return NextResponse.json({ success: false, error: "invalid_token_address" }, { status: 400 });

      for (const log of receipt.logs) {
        const addr = String(log.address || "");
        if (addr.toLowerCase() !== tokenAddress.toLowerCase()) continue;
        try {
          const parsed = transferIface.parseLog({ topics: log.topics as string[], data: log.data as string });
          if (!parsed) continue;
          const to = String(parsed.args.to || "");
          const value = BigInt(String(parsed.args.value || 0));
          if (to.toLowerCase() === receive.toLowerCase()) {
            paidAtomic += value;
          }
        } catch {
        }
      }
    }

    if (paidAtomic < expectedAtomic) {
      return NextResponse.json({ success: false, error: "insufficient_amount", details: { paidAtomic: paidAtomic.toString(), expectedAtomic: expectedAtomic.toString() } }, { status: 400 });
    }
    return await finalizePrintifyAndStoreOrder(req, checkoutId, txHash, checkout, required);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

async function finalizePrintifyAndStoreOrder(
  req: Request,
  checkoutId: string,
  txHash: string,
  checkout: ReturnType<typeof getCryptoCheckout> extends infer T ? Exclude<T, null> : never,
  requiredConfirmations: number,
) {
  void requiredConfirmations;
  const shopId = (process.env.PRINTIFY_SHOP_ID || "").trim();
  if (!shopId) return NextResponse.json({ success: false, error: "missing_PRINTIFY_SHOP_ID" }, { status: 500 });

  const origin = req.headers.get("origin") || "";
  const items = Array.isArray(checkout.items) ? checkout.items : [];
  const lineItems: PrintifyLineItem[] = [];

  for (const raw of items as CartItem[]) {
    const item = isRecord(raw) ? (raw as Record<string, unknown>) : {};
    const meta = isRecord(item.metadata) ? (item.metadata as Record<string, unknown>) : {};
    const printType = getString(meta.printType, 64) || "standard";
    const resolvedTemplateProductId = resolveTemplateProductIdForItem(meta, {
      defaultTemplateProductId: process.env.PRINTIFY_TEMPLATE_PRODUCT_ID,
      aopTemplateProductId: process.env.PRINTIFY_AOP_TEMPLATE_PRODUCT_ID,
    });
    const template = await getTemplateProduct(shopId, resolvedTemplateProductId || undefined);
    const blueprintId = getNumber(template.blueprint_id);
    const printProviderId = getNumber(template.print_provider_id);
    if (!Number.isFinite(blueprintId) || !Number.isFinite(printProviderId)) {
      return NextResponse.json({ success: false, error: "template_missing_ids" }, { status: 500 });
    }
    const sku = resolveSkuFromCartItem(item);
    const variantId = sku ? getVariantIdFromTemplate(template, sku) : getVariantIdFromTemplate(template, "");
    const quantity = Math.max(1, Math.trunc(getNumber(item.quantity) || 1));
    const title = getString(item.title, 80) || "Design";
    const imageUrl = resolveCartImageUrl(origin, item);
    if (!imageUrl) return NextResponse.json({ success: false, error: "missing_item_image" }, { status: 400 });

    const base64 = await fetchImageAsBase64(imageUrl);
    const previewUrl = await uploadImageToPrintify(buildPrintifyFileName(title, String(item.id || "item")), base64);
    const placementKey = "front";
    const transform = getTransformFromTemplate(template, variantId, placementKey);
    const desiredX = 0.5;
    const desiredY = 0.36;
    const desiredScale = 0.78;
    const finalTransform = {
      x: desiredX,
      y: desiredY,
      scale: desiredScale,
      angle: Number.isFinite(transform.angle) ? transform.angle : 0,
    };
    const availablePlacements = getPlacementKeysForVariant(template, variantId);
    const printAreas =
      printType === "all_over_print"
        ? Object.fromEntries(
            expandAopPlacementKeys(availablePlacements).map((placement) => {
              const placementTransform = getTransformFromTemplate(template, variantId, placement);
              return [
                placement,
                [
                  {
                    src: previewUrl,
                    x: Number.isFinite(placementTransform.x) ? placementTransform.x : 0.5,
                    y: Number.isFinite(placementTransform.y) ? placementTransform.y : 0.5,
                    scale: Number.isFinite(placementTransform.scale) ? placementTransform.scale : 1,
                    angle: Number.isFinite(placementTransform.angle) ? placementTransform.angle : 0,
                  },
                ],
              ];
            }),
          )
        : {
            [placementKey]: [
              {
                src: previewUrl,
                x: finalTransform.x,
                y: finalTransform.y,
                scale: finalTransform.scale,
                angle: finalTransform.angle,
              },
            ],
          };

    lineItems.push({
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variant_id: variantId,
      quantity,
      external_id: String(item.id || ""),
      print_areas: printAreas,
    });
  }

  const shippingName = checkout.shipping?.customerName || "Customer Order";
  const { first, last } = splitName(shippingName);
  const addressTo: PrintifyAddressTo = {
    first_name: first,
    last_name: last,
    email: checkout.shipping?.email || "",
    phone: checkout.shipping?.phone || "",
    country: checkout.shipping?.country || "US",
    region: checkout.shipping?.region || "",
    address1: checkout.shipping?.address1 || "",
    address2: checkout.shipping?.address2 || undefined,
    city: checkout.shipping?.city || "",
    zip: checkout.shipping?.zip || "",
  };

  const printifyOrder = (await printifyFetch(`/v1/shops/${shopId}/orders.json`, {
    method: "POST",
    body: JSON.stringify({
      external_id: `crypto_${checkoutId}`,
      label: `ForeverTech Crypto ${checkoutId}`,
      line_items: lineItems,
      shipping_method: 1,
      is_printify_express: false,
      is_economy_shipping: false,
      send_shipping_notification: true,
      address_to: addressTo,
    }),
  })) as unknown;

  const printifyOrderId = isRecord(printifyOrder) ? getString((printifyOrder as Record<string, unknown>).id) : "";
  const key = checkout.userId || checkout.deviceId || "anonymous";
  const order: OrderRecord = {
    id: `crypto_${checkoutId}`,
    createdAt: new Date().toISOString(),
    status: "submitted",
    stripeSessionId: `crypto_${checkoutId}`,
    printifyOrderId: printifyOrderId || undefined,
    total: checkout.amountUsd,
    items: (checkout.items || []).map((x) => {
      const rec = isRecord(x) ? (x as Record<string, unknown>) : {};
      return {
        id: getString(rec.id, 80) || "",
        title: getString(rec.title, 200) || "Item",
        quantity: Math.max(1, Math.trunc(getNumber(rec.quantity) || 1)),
        price: Number.isFinite(getNumber(rec.price)) ? getNumber(rec.price) : 0,
        imageUrl: getString(rec.imageUrl, 600) || getString(rec.image, 600) || "",
        metadata: isRecord(rec.metadata) ? (rec.metadata as Record<string, unknown>) : {},
      };
    }),
  };

  addOrder(key, order);
  clearCart(checkout.deviceId);

  setCryptoCheckout({ ...checkout, status: "confirmed", txHash, printifyOrderId: printifyOrderId || undefined });

  return NextResponse.json({ success: true, data: { confirmed: true, printifyOrderId, txHash } }, { status: 200 });
}
