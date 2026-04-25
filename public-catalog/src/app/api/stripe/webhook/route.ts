import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { addOrder, clearCart, getCart, type OrderLineItem, type OrderRecord } from '@/lib/cartStore';
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
type BackStyle = 'landscape' | 'diagonal';
const cachedBackPreviewUrls: Partial<Record<BackStyle, string>> = {};
const cachedBackPreviewUrlsAt: Partial<Record<BackStyle, number>> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function printifyFetch(path: string, init?: RequestInit) {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    throw new Error('Missing PRINTIFY_API_TOKEN');
  }

  const res = await fetch(`https://api.printify.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'public-catalog',
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Printify API error (${res.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function fetchImageAsBase64(url: string) {
  const res = await fetch(url);
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

  for (const v of variantsRaw as PrintifyTemplateVariant[]) {
    if (!isRecord(v)) continue;
    const vSku = getString(v.sku);
    if (vSku && vSku === sku) {
      const id = getNumber(v.id);
      if (Number.isFinite(id)) return id;
    }
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

async function getBackDesignPreviewUrl(style: BackStyle) {
  const ttlMs = 24 * 60 * 60 * 1000;
  const cached = cachedBackPreviewUrls[style];
  const cachedAt = cachedBackPreviewUrlsAt[style] || 0;
  if (cached && Date.now() - cachedAt < ttlMs) return cached;

  const customPath = (process.env.PRINTIFY_BACK_POSSIBLE_IMAGE_PATH || '').trim();
  if (customPath) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
    const imageUrl =
      customPath.startsWith('http://') || customPath.startsWith('https://') ? customPath : `${origin}${customPath}`;
    const base64 = await fetchImageAsBase64(imageUrl);
    const previewUrl = await uploadImageToPrintify(`back-possible-custom-${style}.png`, base64);
    cachedBackPreviewUrls[style] = previewUrl;
    cachedBackPreviewUrlsAt[style] = Date.now();
    return previewUrl;
  }

  const svg =
    style === 'landscape'
      ? `
<svg xmlns="http://www.w3.org/2000/svg" width="5200" height="1500" viewBox="0 0 5200 1500">
  <rect width="5200" height="1500" fill="rgba(0,0,0,0)"/>
  <g transform="translate(2600,750)">
    <rect x="-2500" y="-520" width="5000" height="1040" rx="70" fill="#ff1f5d"/>
    <text x="0" y="300" text-anchor="middle"
      font-family="Impact, Arial Black, Arial, sans-serif"
      font-size="820" font-weight="900" letter-spacing="18"
      fill="#f2f2f2" stroke="#d9d9d9" stroke-width="32" paint-order="stroke">
      POSSIBLE
    </text>
  </g>
</svg>`.trim()
      : `
<svg xmlns="http://www.w3.org/2000/svg" width="4200" height="4200" viewBox="0 0 4200 4200">
  <rect width="4200" height="4200" fill="rgba(0,0,0,0)"/>
  <g transform="translate(2100,2100) rotate(-35)">
    <rect x="-2800" y="-520" width="5600" height="1040" rx="70" fill="#ff1f5d"/>
    <text x="0" y="300" text-anchor="middle"
      font-family="Impact, Arial Black, Arial, sans-serif"
      font-size="820" font-weight="900" letter-spacing="18"
      fill="#f2f2f2" stroke="#d9d9d9" stroke-width="32" paint-order="stroke">
      POSSIBLE
    </text>
  </g>
</svg>`.trim();

  const png = await sharp(Buffer.from(svg, 'utf8'))
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
    .toBuffer();
  const base64 = png.toString('base64');
  const previewUrl = await uploadImageToPrintify(`back-possible-${style}.png`, base64);
  cachedBackPreviewUrls[style] = previewUrl;
  cachedBackPreviewUrlsAt[style] = Date.now();
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
    out.push({
      id: getString(anyItem.id) || undefined,
      title: title || undefined,
      quantity,
      price: Number.isFinite(price) ? price : undefined,
      imageUrl,
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
  try {
    const allowDevBypass =
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

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const deviceId = getString(session.metadata?.deviceId) || 'anonymous';
  const userId = getString(session.metadata?.userId);
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

    const rawImageUrl = typeof item.imageUrl === 'string' ? item.imageUrl : typeof item.image === 'string' ? item.image : '';

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
    const previewUrl = await uploadImageToPrintify(`${item.id || 'design'}.png`, base64);
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
      const backStyleRaw = typeof (metadata as Record<string, unknown>)['backStyle'] === 'string'
        ? String((metadata as Record<string, unknown>)['backStyle'])
        : '';
      const backStyle: BackStyle = backStyleRaw === 'diagonal' ? 'diagonal' : 'landscape';

      if (backKey) {
        const backPreviewUrl = await getBackDesignPreviewUrl(backStyle);
        const backFinal =
          backStyle === 'landscape'
            ? { x: 0.5, y: 0.18, scale: 0.98, angle: 0 }
            : { x: 0.5, y: 0.22, scale: 0.9, angle: 0 };

        printAreas[backKey] = [
          {
            src: backPreviewUrl,
            x: backFinal.x,
            y: backFinal.y,
            scale: backFinal.scale,
            angle: backFinal.angle,
          },
        ];
      } else {
        console.error('No back placement found for variant', { variantId, availablePlacements });
      }
    } catch (e) {
      console.error('Back design upload/placement failed', e);
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
      label: session.id,
      line_items: lineItems,
      shipping_method: 1,
      is_printify_express: false,
      is_economy_shipping: false,
      send_shipping_notification: true,
      address_to: addressTo,
    }),
  })) as unknown;

  const key = userId || deviceId || 'anonymous';
  const order: OrderRecord = {
    id: session.id,
    createdAt: new Date().toISOString(),
    status: 'submitted',
    stripeSessionId: session.id,
    printifyOrderId: isRecord(printifyOrder) ? getString(printifyOrder.id) || undefined : undefined,
    total: getCartLineItems(cartItems as CartItem[]).reduce((sum, li) => sum + (li.price || 0) * li.quantity, 0),
    items: getCartLineItems(cartItems as CartItem[]),
  };

  addOrder(key, order);

  clearCart(deviceId);

  return NextResponse.json({ received: true });
}
