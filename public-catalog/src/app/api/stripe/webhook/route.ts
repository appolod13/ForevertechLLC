import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { addOrder, clearCart, getCart, type OrderLineItem, type OrderRecord } from '@/lib/cartStore';
import { buildBackTextSvg, getPrintifyBackTextConfig } from '@/lib/printifyBackText';
import { requestIbmQuantumProof, type QuantumProof } from '@/lib/quantumVerified';
import sharp from 'sharp';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' });
}

type PrintifyAddressTo = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
};

type PrintifyPrintAreaInfo = {
  src: string;
  x: number;
  y: number;
  scale: number;
  angle: number;
};

type PrintifyLineItem = {
  print_provider_id: number;
  blueprint_id: number;
  variant_id: number;
  quantity: number;
  print_areas: Record<string, PrintifyPrintAreaInfo[]>;
  external_id?: string;
};

type CartItem = {
  id?: string;
  quantity?: number;
  size?: string;
  imageUrl?: string;
  image?: string;
  metadata?: Record<string, unknown>;
};

type PrintifyItemMeta = {
  sku?: unknown;
  blueprintId?: unknown;
  printProviderId?: unknown;
  variantId?: unknown;
  placementKey?: unknown;
};

type PrintifyTemplateVariant = {
  id?: unknown;
  sku?: unknown;
};

type PrintifyTemplatePlaceholderImage = {
  x?: unknown;
  y?: unknown;
  scale?: unknown;
  angle?: unknown;
};

type PrintifyTemplatePlaceholder = {
  position?: unknown;
  images?: unknown;
};

type PrintifyTemplatePrintArea = {
  variant_ids?: unknown;
  placeholders?: unknown;
};

type PrintifyTemplateProduct = {
  blueprint_id?: unknown;
  print_provider_id?: unknown;
  variants?: unknown;
  print_areas?: unknown;
};

let cachedTemplateProductId: string | undefined;
let cachedLogoPreviewUrl: string | undefined;
let cachedLogoPreviewUrlAt = 0;
const cachedBackWordPreviewUrls = new Map<string, { url: string; at: number }>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const PROMPT_STOPWORDS = new Set([
  'a','an','the','and','or','but','with','without','to','of','in','on','for','from','by','at','as','is','are','was','were','be','been','being',
  'this','that','these','those','it','its','your','my','our','their','you','me','we','they','them','i',
  'image','design','shirt','tshirt','tee','print','graphic','art','logo','text','words','watermark','high','quality','ultra','hd','4k','8k'
]);

const PROMPT_STYLEWORDS = new Set([
  'neon','cinematic','futuristic','cyberpunk','sci','scifi','sci-fi','photoreal','photorealistic','realistic','render','rendered',
  'rainy','foggy','moody','dramatic','wide','closeup','close-up','portrait','landscape','macro','bokeh','volumetric','lighting','haze',
  'ultra','high','quality','detailed','detail','sharp','8k','4k','hd'
]);

function sanitizeKeyword(word: string): string {
  const w = (word || '').trim().replace(/[^A-Za-z0-9]/g, '');
  return w.slice(0, 18);
}

function sanitizeBannerText(text: string): string {
  const t = (text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim();
  return t.slice(0, 96);
}

function titleCaseWord(word: string): string {
  const w = (word || '').trim();
  if (!w) return '';
  return w.slice(0, 1).toUpperCase() + w.slice(1);
}

function summarizePromptToOneWord(prompt: string): string {
  const p = (prompt || '').toLowerCase();
  const tokens = p.match(/[a-z0-9]+/g) || [];
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (PROMPT_STOPWORDS.has(t)) continue;
    if (PROMPT_STYLEWORDS.has(t)) continue;
    return t.slice(0, 24);
  }

  const counts = new Map<string, number>();

  for (const t of tokens) {
    if (t.length < 3) continue;
    if (PROMPT_STOPWORDS.has(t)) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }

  let best = '';
  let bestScore = -1;
  for (const [t, c] of counts.entries()) {
    const score = c * 100 + Math.min(t.length, 24);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  const fallback = tokens.find((t) => t.length >= 3) || 'custom';
  return (best || fallback).slice(0, 24);
}

function promptFromCartItem(item: CartItem, metadata: Record<string, unknown>): string {
  const direct = (item as unknown as { originalPrompt?: unknown }).originalPrompt;
  if (typeof direct === 'string' && direct.trim()) return direct;
  const mp = metadata['originalPrompt'] ?? metadata['prompt'] ?? metadata['title'];
  if (typeof mp === 'string' && mp.trim()) return mp;
  if (mp) {
    try {
      return JSON.stringify(mp);
    } catch {
      return String(mp);
    }
  }
  return '';
}

function keywordFromCartItem(item: CartItem, metadata: Record<string, unknown>): string {
  const prompt = promptFromCartItem(item, metadata);
  const one = titleCaseWord(summarizePromptToOneWord(prompt));
  return one || 'Custom';
}

function summarizePromptToBannerText(prompt: string): string {
  const p = (prompt || '').toLowerCase();
  const tokens = p.match(/[a-z0-9]+/g) || [];
  const words: string[] = [];
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (PROMPT_STOPWORDS.has(t)) continue;
    if (PROMPT_STYLEWORDS.has(t)) continue;
    words.push(t.slice(0, 12));
    if (words.length >= 12) break;
  }
  if (!words.length) {
    const one = summarizePromptToOneWord(prompt);
    return one || 'CUSTOM';
  }
  return words.join(' ');
}

function bannerTextFromCartItem(item: CartItem, metadata: Record<string, unknown>): string {
  const cfg = getPrintifyBackTextConfig();
  if (cfg.textMode === 'custom' && cfg.customText.trim()) {
    const clean = sanitizeBannerText(cfg.customText) || 'CUSTOM';
    return clean.toUpperCase();
  }
  const prompt = promptFromCartItem(item, metadata);
  const phrase = summarizePromptToBannerText(prompt);
  return phrase ? phrase.toUpperCase() : 'CUSTOM';
}

async function renderBackBannerBase64(text: string, seedSalt?: string) {
  const cfg = getPrintifyBackTextConfig();
  const clean = sanitizeBannerText(text) || 'CUSTOM';
  const salted = seedSalt ? { ...cfg, version: `${cfg.version}|${seedSalt}` } : cfg;
  const svg = buildBackTextSvg(clean, salted);

  const png = await sharp(Buffer.from(svg, 'utf8'))
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
    .toBuffer();

  return png.toString('base64');
}

async function getBackWordPreviewUrl(keyword: string, seedSalt?: string) {
  const cfg = getPrintifyBackTextConfig();
  const ttlMs = 24 * 60 * 60 * 1000;
  const kw = sanitizeBannerText(keyword) || 'CUSTOM';
  const saltKey = seedSalt ? `|q|${seedSalt}` : '';
  const cacheKey = `collage_v4|${cfg.version}${saltKey}|${kw.toUpperCase()}`;
  const cached = cachedBackWordPreviewUrls.get(cacheKey);
  if (cached && Date.now() - cached.at < ttlMs) return cached.url;

  const base64 = await renderBackBannerBase64(kw, seedSalt);
  const fileSafe = (kw || 'CUSTOM').replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]/g, '').slice(0, 48) || 'CUSTOM';
  const saltTag = seedSalt ? `-q-${seedSalt.slice(0, 8)}` : '';
  const previewUrl = await uploadImageToPrintify(`back-collage-v4-${cfg.version}${saltTag}-${fileSafe}.png`, base64);
  cachedBackWordPreviewUrls.set(cacheKey, { url: previewUrl, at: Date.now() });
  return previewUrl;
}

function buildPrintifyOrderLabel(sessionId: string, keyword: string): string {
  const kw = sanitizeKeyword(keyword) || 'Custom';
  const base = `${kw} ${sessionId}`;
  return base.length > 100 ? base.slice(0, 100) : base;
}

function buildPrintifyFileName(keyword: string, itemId: string): string {
  const kw = sanitizeKeyword(keyword) || 'Design';
  const id = String(itemId || 'design').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || 'design';
  return `${kw}_${id}.png`;
}

async function printifyFetch(path: string, init?: RequestInit) {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    throw new Error('Missing PRINTIFY_API_TOKEN');
  }

  let res: Response;
  try {
    res = await fetch(`https://api.printify.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'public-catalog',
        'content-type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || '');
    throw new Error(`Printify network error: ${path}${msg ? ` (${msg})` : ''}`);
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
    const msg = e instanceof Error ? e.message : String(e || '');
    throw new Error(`Image fetch network error: ${url}${msg ? ` (${msg})` : ''}`);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

async function uploadImageToPrintify(fileName: string, base64Contents: string) {
  const uploaded = await printifyFetch('/v1/uploads/images.json', {
    method: 'POST',
    body: JSON.stringify({
      file_name: fileName,
      contents: base64Contents,
    }),
  });

  if (!uploaded || typeof uploaded.preview_url !== 'string') {
    throw new Error('Printify upload did not return preview_url');
  }

  return uploaded.preview_url as string;
}

async function getTemplateProduct(shopId: string) {
  const templateProductId = process.env.PRINTIFY_TEMPLATE_PRODUCT_ID;
  let resolvedProductId = templateProductId;
  if (!resolvedProductId && process.env.NODE_ENV !== 'production') {
    if (cachedTemplateProductId) {
      resolvedProductId = cachedTemplateProductId;
    } else {
      const env = process.env as Record<string, string | undefined>;
      const skuCandidates = [
        env.PRINTIFY_SKU_S,
        env.PRINTIFY_SKU_M,
        env.PRINTIFY_SKU_L,
        env.PRINTIFY_SKU_XL,
        env.PRINTIFY_SKU_XXL,
        env.PRINTIFY_DEFAULT_SKU,
      ]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean);

      let fallbackId = '';
      for (let page = 1; page <= 3 && !resolvedProductId; page++) {
        const listed = (await printifyFetch(`/v1/shops/${shopId}/products.json?page=${page}&limit=50`)) as unknown;
        const data = isRecord(listed) && Array.isArray(listed.data) ? listed.data : Array.isArray(listed) ? listed : [];

        for (const p of data as Array<Record<string, unknown>>) {
          if (!fallbackId) fallbackId = getString(p.id);
          const variantsRaw = p.variants;
          if (!Array.isArray(variantsRaw) || skuCandidates.length === 0) continue;
          for (const v of variantsRaw as PrintifyTemplateVariant[]) {
            if (!isRecord(v)) continue;
            const vSku = getString(v.sku);
            if (vSku && skuCandidates.includes(vSku)) {
              resolvedProductId = getString(p.id);
              break;
            }
          }
          if (resolvedProductId) break;
        }
      }

      if (!resolvedProductId && fallbackId) {
        resolvedProductId = fallbackId;
      }

      if (resolvedProductId) {
        cachedTemplateProductId = resolvedProductId;
      }
    }
  }

  if (!resolvedProductId) {
    throw new Error('Missing PRINTIFY_TEMPLATE_PRODUCT_ID');
  }

  const product = (await printifyFetch(`/v1/shops/${shopId}/products/${resolvedProductId}.json`)) as unknown;
  if (!isRecord(product)) {
    throw new Error('Printify template product response was invalid');
  }
  return product as PrintifyTemplateProduct;
}

function getNumber(value: unknown) {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : NaN;
}

function getVariantIdFromTemplate(template: PrintifyTemplateProduct, sku: string) {
  const variantsRaw = template.variants;
  if (!Array.isArray(variantsRaw)) {
    throw new Error('Printify template product is missing variants');
  }

  let fallbackVariantId: number | null = null;
  for (const v of variantsRaw as PrintifyTemplateVariant[]) {
    if (!isRecord(v)) continue;
    const vSku = getString(v.sku);
    const candidateId = getNumber(v.id);
    if (fallbackVariantId === null && Number.isFinite(candidateId)) {
      fallbackVariantId = candidateId;
    }
    if (vSku && vSku === sku) {
      if (Number.isFinite(candidateId)) return candidateId;
    }
  }

  if (typeof fallbackVariantId === 'number' && Number.isFinite(fallbackVariantId)) {
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
    const variantIdsRaw = area.variant_ids;
    const placeholdersRaw = area.placeholders;
    const variantIds = Array.isArray(variantIdsRaw) ? variantIdsRaw.map(getNumber).filter(Number.isFinite) : [];
    if (!variantIds.includes(variantId)) continue;
    if (!Array.isArray(placeholdersRaw)) continue;

    for (const ph of placeholdersRaw as PrintifyTemplatePlaceholder[]) {
      if (!isRecord(ph)) continue;
      const pos = getString(ph.position);
      if (!pos || pos !== placementKey) continue;
      const imagesRaw = ph.images;
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
    const variantIdsRaw = area.variant_ids;
    const placeholdersRaw = area.placeholders;
    const variantIds = Array.isArray(variantIdsRaw) ? variantIdsRaw.map(getNumber).filter(Number.isFinite) : [];
    if (!variantIds.includes(variantId)) continue;
    if (!Array.isArray(placeholdersRaw)) continue;

    for (const ph of placeholdersRaw as PrintifyTemplatePlaceholder[]) {
      if (!isRecord(ph)) continue;
      const pos = getString(ph.position);
      if (pos) keys.push(pos);
    }
  }

  return Array.from(new Set(keys));
}

function pickBackPlacementKey(placements: string[]) {
  if (placements.includes('back')) return 'back';
  const lower = placements.map((p) => ({ p, l: p.toLowerCase() }));
  const containsBack = lower.find((x) => x.l.includes('back'));
  return containsBack?.p || '';
}

async function getCompanyLogoPreviewUrl(origin: string) {
  const ttlMs = 24 * 60 * 60 * 1000;
  if (cachedLogoPreviewUrl && Date.now() - cachedLogoPreviewUrlAt < ttlMs) return cachedLogoPreviewUrl;

  const logoPath = process.env.PRINTIFY_COMPANY_LOGO_PATH || '/images/Forevertech_logo.jpg';
  const logoUrl = logoPath.startsWith('http://') || logoPath.startsWith('https://') ? logoPath : `${origin}${logoPath}`;
  const base64 = await fetchImageAsBase64(logoUrl);
  const previewUrl = await uploadImageToPrintify('company-logo.jpg', base64);
  cachedLogoPreviewUrl = previewUrl;
  cachedLogoPreviewUrlAt = Date.now();
  return previewUrl;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || 'Customer';
  const last = parts.slice(1).join(' ') || 'Customer';
  return { first, last };
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function isSameOrigin(req: Request): boolean {
  const host = (req.headers.get('host') || '').trim();
  const origin = (req.headers.get('origin') || '').trim();
  if (!host || !origin) return false;
  return origin === `https://${host}` || origin === `http://${host}`;
}

function getCartLineItems(cartItems: CartItem[]): OrderLineItem[] {
  const out: OrderLineItem[] = [];
  for (const item of cartItems) {
    const anyItem = isRecord(item) ? (item as Record<string, unknown>) : {};
    const quantity = Math.max(1, Number(anyItem.quantity ?? 1));
    const price = getNumber(anyItem.price);
    const title = getString(anyItem.title);
    const imageUrl =
      typeof anyItem.imageUrl === 'string'
        ? anyItem.imageUrl
        : typeof anyItem.image === 'string'
          ? anyItem.image
          : undefined;
    const metadata = isRecord(anyItem.metadata) ? (anyItem.metadata as Record<string, unknown>) : undefined;
    out.push({
      id: getString(anyItem.id) || undefined,
      title: title || undefined,
      quantity,
      price: Number.isFinite(price) ? price : undefined,
      imageUrl,
      metadata,
    });
  }
  return out;
}

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let stripe: Stripe;

  const payload = await request.text();

  let event: Stripe.Event;
  let allowDevBypass = false;
  try {
    allowDevBypass =
      process.env.NODE_ENV !== 'production' && request.headers.get('x-dev-bypass') === '1' && isSameOrigin(request);

    if (allowDevBypass) {
      const parsed: unknown = payload ? JSON.parse(payload) : null;
      event = parsed as Stripe.Event;
      if (event?.type === 'checkout.session.completed') {
        const sessionLike = (event.data as { object?: { id?: string } } | undefined)?.object;
        const sessionId = sessionLike?.id;
        if (typeof sessionId === 'string' && sessionId) {
          stripe = getStripeClient();
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          (event.data as { object: Stripe.Checkout.Session }).object = session;
        }
      }
    } else {
      if (!sig || !webhookSecret) {
        return NextResponse.json({ error: 'Missing webhook configuration' }, { status: 500 });
      }
      stripe = getStripeClient();
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const deviceId = getString(session.metadata?.deviceId) || 'anonymous';
    const userId = getString(session.metadata?.userId);
    const quantumVerifiedRequested = getString(session.metadata?.quantumVerified) === '1';
    const quantumFeeCents =
      typeof session.metadata?.quantumFeeCents === 'string' && session.metadata.quantumFeeCents.trim()
        ? Math.max(0, Math.min(50_000, Math.trunc(Number(session.metadata.quantumFeeCents))))
        : 0;
    let quantumProof: QuantumProof | null = null;
    let quantumRefunded = false;
    let quantumVerified = quantumVerifiedRequested;

  if (quantumVerifiedRequested) {
    try {
      quantumProof = await requestIbmQuantumProof({ orderId: session.id, purpose: 'seed', timeoutMs: 6000 });
    } catch {
      quantumProof = null;
      quantumVerified = false;
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : '';
      if (paymentIntentId && quantumFeeCents > 0) {
        try {
          const stripeClient = getStripeClient();
          await stripeClient.refunds.create({ payment_intent: paymentIntentId, amount: quantumFeeCents });
          quantumRefunded = true;
        } catch {
          quantumRefunded = false;
        }
      }
    }
  }
  const origin =
    getString(session.metadata?.origin) ||
    (process.env.NEXT_PUBLIC_SITE_URL || '') ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '');
  const shopId = process.env.PRINTIFY_SHOP_ID;

  if (!shopId) {
    return NextResponse.json({ error: 'Missing PRINTIFY_SHOP_ID' }, { status: 500 });
  }

  const cartItems = getCart(deviceId);
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return NextResponse.json({ received: true });
  }

  const firstItem = (cartItems as CartItem[])[0];
  const firstMeta = firstItem?.metadata && isRecord(firstItem.metadata) ? firstItem.metadata : {};
  const orderKeyword = keywordFromCartItem(firstItem || {}, firstMeta);
  const template = await getTemplateProduct(shopId);
  const templateBlueprintId = getNumber(template.blueprint_id);
  const templatePrintProviderId = getNumber(template.print_provider_id);
  if (!Number.isFinite(templateBlueprintId) || !Number.isFinite(templatePrintProviderId)) {
    throw new Error('Printify template product is missing blueprint_id or print_provider_id');
  }

  const customerName = getString(session.metadata?.customerName);
  const { first, last } = splitName(customerName);

  const addressTo: PrintifyAddressTo = {
    first_name: first,
    last_name: last,
    email: getString(session.customer_details?.email) || getString(session.metadata?.email) || '',
    phone: getString(session.metadata?.phone),
    country: getString(session.metadata?.country) || 'US',
    region: getString(session.metadata?.region),
    address1: getString(session.metadata?.address),
    address2: getString(session.metadata?.address2) || undefined,
    city: getString(session.metadata?.city),
    zip: getString(session.metadata?.zip),
  };

  const lineItems: PrintifyLineItem[] = [];

  for (const item of cartItems as CartItem[]) {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const metadata = item.metadata && isRecord(item.metadata) ? item.metadata : {};
    const keyword = keywordFromCartItem(item, metadata);
    const rawPrintify = metadata['printify'];
    const printify: PrintifyItemMeta | null = isRecord(rawPrintify) ? (rawPrintify as PrintifyItemMeta) : null;
    const variant = typeof metadata['variant'] === 'string' ? metadata['variant'] : '';
    const printifySku = typeof metadata['printifySku'] === 'string' ? metadata['printifySku'] : '';
    const itemSize =
      typeof item.size === 'string'
        ? item.size
        : typeof variant === 'string'
          ? variant
          : '';
    const envSku =
      itemSize && (process.env as Record<string, string | undefined>)[`PRINTIFY_SKU_${itemSize}`]
        ? (process.env as Record<string, string | undefined>)[`PRINTIFY_SKU_${itemSize}`]
        : process.env.PRINTIFY_DEFAULT_SKU;
    const sku = getString(printify?.sku) || getString(printifySku) || getString(envSku);
    const placementKey = getString(printify?.placementKey) || process.env.PRINTIFY_PLACEMENT || 'front';
    const blueprintId = Number.isFinite(getNumber(printify?.blueprintId)) ? getNumber(printify?.blueprintId) : templateBlueprintId;
    const printProviderId = Number.isFinite(getNumber(printify?.printProviderId))
      ? getNumber(printify?.printProviderId)
      : templatePrintProviderId;
    const mappedVariantId = getNumber(printify?.variantId);
    const variantId = Number.isFinite(mappedVariantId)
      ? mappedVariantId
      : sku
        ? getVariantIdFromTemplate(template, sku)
        : NaN;

    if (!Number.isFinite(blueprintId) || !Number.isFinite(printProviderId) || !Number.isFinite(variantId)) {
      throw new Error('Missing Printify mapping (need sku or blueprintId/printProviderId/variantId)');
    }

    const itemMeta = isRecord(item.metadata) ? item.metadata : {};
    const ipfsGateway =
      typeof itemMeta.ipfs_gateway === 'string' && itemMeta.ipfs_gateway.trim()
        ? itemMeta.ipfs_gateway.trim()
        : typeof itemMeta.ipfs_url === 'string' && itemMeta.ipfs_url.startsWith('ipfs://')
          ? itemMeta.ipfs_url.replace('ipfs://', 'https://ipfs.io/ipfs/')
          : '';

    const rawImageUrl =
      ipfsGateway ||
      (typeof item.imageUrl === 'string' ? item.imageUrl : typeof item.image === 'string' ? item.image : '');

    if (!rawImageUrl || rawImageUrl.startsWith('blob:')) {
      throw new Error('Cart item imageUrl is missing or not accessible for upload');
    }

    const absoluteImageUrl =
      rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://')
        ? rawImageUrl
        : origin
          ? `${origin}${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`
          : rawImageUrl;

    const base64 = await fetchImageAsBase64(absoluteImageUrl);
    const previewUrl = await uploadImageToPrintify(buildPrintifyFileName(keyword, String(item.id || 'design')), base64);
    const transform = getTransformFromTemplate(template, variantId, placementKey);
    const desiredX = 0.5;
    const desiredY = 0.36;
    const desiredScale = 0.78;
    const finalTransform =
      placementKey === 'front'
        ? {
            x: desiredX,
            y: desiredY,
            scale: desiredScale,
            angle: Number.isFinite(transform.angle) ? transform.angle : 0,
          }
        : transform;

    const printAreas: Record<string, PrintifyPrintAreaInfo[]> = {
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

    if (origin) {
      try {
        const availablePlacements = getPlacementKeysForVariant(template, variantId);
        const preferredPlacement = (process.env.PRINTIFY_LOGO_PLACEMENT || '').trim();
        const candidates = [
          preferredPlacement,
          'neck',
          'inside_label',
          'inner_label',
          'label',
        ].filter(Boolean);
        const logoPlacementKey = candidates.find((c) => availablePlacements.includes(c));

        if (logoPlacementKey) {
          const logoPreviewUrl = await getCompanyLogoPreviewUrl(origin);
          const logoTransform = getTransformFromTemplate(template, variantId, logoPlacementKey);
          const logoFinal = {
            x: Number.isFinite(logoTransform.x) ? logoTransform.x : 0.5,
            y: Number.isFinite(logoTransform.y) ? logoTransform.y : 0.12,
            scale: Math.min(1, Math.max(0.1, (Number.isFinite(logoTransform.scale) ? logoTransform.scale : 0.35) * 1.45)),
            angle: Number.isFinite(logoTransform.angle) ? logoTransform.angle : 0,
          };

          printAreas[logoPlacementKey] = [
            {
              src: logoPreviewUrl,
              x: logoFinal.x,
              y: logoFinal.y,
              scale: logoFinal.scale,
              angle: logoFinal.angle,
            },
          ];
        }
      } catch {
      }
    }

    try {
      const availablePlacements = getPlacementKeysForVariant(template, variantId);
      const backKey = pickBackPlacementKey(availablePlacements);

      if (backKey) {
        const bannerText = bannerTextFromCartItem(item, metadata);
        const backPreviewUrl = await getBackWordPreviewUrl(bannerText, quantumProof?.seed);

        printAreas[backKey] = [
          {
            src: backPreviewUrl,
            x: 0.5,
            y: 0.5,
            scale: 0.9,
            angle: 0,
          },
        ];
      } else {
        console.error('No back placement found for variant', { variantId, availablePlacements });
      }
    } catch (e) {
      console.error('Back word upload/placement failed', e);
    }

    lineItems.push({
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variant_id: variantId,
      quantity,
      external_id: String(item.id || ''),
      print_areas: printAreas,
    });
  }

  const printifyOrder = (await printifyFetch(`/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    body: JSON.stringify({
      external_id: session.id,
      label: buildPrintifyOrderLabel(session.id, orderKeyword),
      line_items: lineItems,
      shipping_method: 1,
      is_printify_express: false,
      is_economy_shipping: false,
      send_shipping_notification: true,
      address_to: addressTo,
    }),
  })) as unknown;

  const key = userId || deviceId || 'anonymous';
  const cartTotal = getCartLineItems(cartItems as CartItem[]).reduce((sum, li) => sum + (li.price || 0) * li.quantity, 0);
  const sessionTotal = typeof session.amount_total === 'number' ? session.amount_total / 100 : null;
  const order: OrderRecord = {
    id: session.id,
    createdAt: new Date().toISOString(),
    status: 'submitted',
    stripeSessionId: session.id,
    printifyOrderId: isRecord(printifyOrder) ? getString(printifyOrder.id) || undefined : undefined,
    total: typeof sessionTotal === 'number' && Number.isFinite(sessionTotal) ? sessionTotal : cartTotal,
    quantumVerified,
    quantumRefunded,
    quantumProof: quantumProof || undefined,
    items: getCartLineItems(cartItems as CartItem[]),
  };

  addOrder(key, order);

  clearCart(deviceId);

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('stripe.webhook.error', error);
    const message = error instanceof Error ? error.message : String(error || 'unknown_error');
    return NextResponse.json({ error: message, devBypass: allowDevBypass }, { status: 500 });
  }
}
