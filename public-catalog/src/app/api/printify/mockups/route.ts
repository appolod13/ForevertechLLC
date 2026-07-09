import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import { getServiceSupabase } from '@/lib/supabase';
import { computeDesignHash } from '@/lib/designMockups';

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getNumber(value: unknown) {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : NaN;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeMockupsRow(row: Record<string, unknown>) {
  return {
    designHash: getString(row.design_hash),
    status: getString(row.status) || 'pending',
    mockups: {
      frontUrl: getString(row.mockup_front_url) || undefined,
      backUrl: getString(row.mockup_back_url) || undefined,
      leftUrl: getString(row.mockup_left_url) || undefined,
      rightUrl: getString(row.mockup_right_url) || undefined,
    },
    printifyProductId: getString(row.printify_product_id) || undefined,
    error: getString(row.error_message) || undefined,
  };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function printifyFetch(pathname: string, init?: RequestInit) {
  const token = (process.env.PRINTIFY_API_TOKEN || '').trim();
  if (!token) throw new Error('missing_printify_api_token');
  const res = await fetch(`https://api.printify.com${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'public-catalog',
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`printify_api_error:${res.status}:${text}`);
  return text ? (JSON.parse(text) as unknown) : null;
}

async function fetchImageAsBase64(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image_fetch_failed:${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab).toString('base64');
}

async function uploadImageToPrintify(fileName: string, base64Contents: string) {
  const json = await printifyFetch('/v1/uploads/images.json', {
    method: 'POST',
    body: JSON.stringify({
      file_name: fileName,
      contents: base64Contents,
    }),
  });
  if (!isRecord(json)) throw new Error('printify_upload_failed');
  const id = getString(json.id);
  if (!id) throw new Error('printify_upload_missing_id');
  const previewUrl = getString(json.preview_url);
  return { id, previewUrl };
}

type PrintifyTemplateVariant = { id?: unknown; sku?: unknown };
type PrintifyTemplatePlaceholderImage = { x?: unknown; y?: unknown; scale?: unknown; angle?: unknown };
type PrintifyTemplatePlaceholder = { position?: unknown; images?: unknown };
type PrintifyTemplatePrintArea = { variant_ids?: unknown; placeholders?: unknown };
type PrintifyTemplateProduct = { id?: unknown; title?: unknown; blueprint_id?: unknown; print_provider_id?: unknown; variants?: unknown; print_areas?: unknown };

type TemplateTransform = { x: number; y: number; scale: number; angle: number };

type PlacementMatch = {
  key: string;
  transform: TemplateTransform;
};

function normalizePlacementKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function getVariantIds(template: PrintifyTemplateProduct) {
  const variantsRaw = template.variants;
  if (!Array.isArray(variantsRaw)) throw new Error('printify_template_missing_variants');
  const ids: number[] = [];
  for (const v of variantsRaw as PrintifyTemplateVariant[]) {
    if (!isRecord(v)) continue;
    const id = getNumber(v.id);
    if (Number.isFinite(id)) ids.push(id);
  }
  if (!ids.length) throw new Error('printify_template_no_variant_ids');
  return ids;
}

function getAllPlaceholderPositions(template: PrintifyTemplateProduct, variantId: number) {
  const printAreasRaw = template.print_areas;
  if (!Array.isArray(printAreasRaw)) return [];
  for (const pa of printAreasRaw as PrintifyTemplatePrintArea[]) {
    if (!isRecord(pa)) continue;
    const ids = Array.isArray(pa.variant_ids) ? (pa.variant_ids as unknown[]) : [];
    if (!ids.some((id) => getNumber(id) === variantId)) continue;
    const placeholders = Array.isArray(pa.placeholders) ? (pa.placeholders as unknown[]) : [];
    const positions: string[] = [];
    for (const ph of placeholders as PrintifyTemplatePlaceholder[]) {
      if (!isRecord(ph)) continue;
      const pos = getString(ph.position);
      if (pos) positions.push(pos);
    }
    return positions;
  }
  return [];
}

function matchesAlias(position: string, aliases: string[]) {
  const normalized = normalizePlacementKey(position);
  return aliases.some((alias) => {
    const candidate = normalizePlacementKey(alias);
    return normalized === candidate || normalized.includes(candidate);
  });
}

function placementScore(pos: string, want: 'front' | 'back') {
  const p = pos.toLowerCase();
  const w = want.toLowerCase();
  if (p === w) return 100;
  if (p.includes(w)) return 80;
  if (want === 'front' && p.includes('chest')) return 70;
  if (want === 'back' && p.includes('rear')) return 70;
  return 0;
}

function pickPlaceholderPosition(positions: string[], want: 'front' | 'back') {
  let best = positions[0] || '';
  let bestScore = -1;
  for (const p of positions) {
    const s = placementScore(p, want);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}

function getTransformFromTemplate(template: PrintifyTemplateProduct, variantId: number, placementKey: string) {
  const printAreasRaw = template.print_areas;
  if (!Array.isArray(printAreasRaw)) return { x: 0.5, y: 0.5, scale: 0.8, angle: 0 };
  for (const pa of printAreasRaw as PrintifyTemplatePrintArea[]) {
    if (!isRecord(pa)) continue;
    const ids = Array.isArray(pa.variant_ids) ? (pa.variant_ids as unknown[]) : [];
    if (!ids.some((id) => getNumber(id) === variantId)) continue;
    const placeholders = Array.isArray(pa.placeholders) ? (pa.placeholders as unknown[]) : [];
    for (const ph of placeholders as PrintifyTemplatePlaceholder[]) {
      if (!isRecord(ph)) continue;
      if (getString(ph.position) !== placementKey) continue;
      const images = Array.isArray(ph.images) ? (ph.images as unknown[]) : [];
      const first = images.find((x) => isRecord(x)) as PrintifyTemplatePlaceholderImage | undefined;
      const x = getNumber(first?.x);
      const y = getNumber(first?.y);
      const scale = getNumber(first?.scale);
      const angle = getNumber(first?.angle);
      return {
        x: Number.isFinite(x) ? x : 0.5,
        y: Number.isFinite(y) ? y : 0.5,
        scale: Number.isFinite(scale) ? scale : 0.8,
        angle: Number.isFinite(angle) ? angle : 0,
      };
    }
  }
  return { x: 0.5, y: 0.5, scale: 0.8, angle: 0 };
}

function getPlacementMatch(template: PrintifyTemplateProduct, variantId: number, aliases: string[]) {
  const positions = getAllPlaceholderPositions(template, variantId);
  const key = positions.find((position) => matchesAlias(position, aliases));
  if (!key) return null;
  return {
    key,
    transform: getTransformFromTemplate(template, variantId, key),
  } satisfies PlacementMatch;
}

async function loadLocalAssetAsBase64(relativePath: string) {
  const absolutePath = path.join(process.cwd(), 'public', relativePath.replace(/^\/+/, ''));
  const file = await fs.readFile(absolutePath);
  return file.toString('base64');
}

async function uploadSiteLogoToPrintify(fileSafe: string) {
  const base64 = await loadLocalAssetAsBase64('images/Forevertech_logo.jpg');
  return uploadImageToPrintify(`necktag-logo-${fileSafe}-${Date.now().toString(36)}.jpg`, base64);
}

async function getTemplateProduct(shopId: string, preferredProductId?: string) {
  const preferred = typeof preferredProductId === 'string' ? preferredProductId.trim() : '';
  if (preferred) {
    const p = (await printifyFetch(`/v1/shops/${shopId}/products/${preferred}.json`)) as unknown;
    if (isRecord(p)) return p as PrintifyTemplateProduct;
    throw new Error('printify_template_fetch_failed');
  }

  const listed = (await printifyFetch(`/v1/shops/${shopId}/products.json?page=1&limit=20`)) as unknown;
  const data = isRecord(listed) && Array.isArray(listed.data) ? listed.data : [];
  const first = data.find((x) => isRecord(x) && typeof x.id !== 'undefined') as unknown;
  if (!isRecord(first) || !first.id) throw new Error('printify_template_not_found');
  const id = String(first.id);
  const p = (await printifyFetch(`/v1/shops/${shopId}/products/${id}.json`)) as unknown;
  if (isRecord(p)) return p as PrintifyTemplateProduct;
  throw new Error('printify_template_fetch_failed');
}

function extractMockupUrls(product: unknown) {
  const rec = isRecord(product) ? (product as Record<string, unknown>) : null;
  const imagesRaw = rec && Array.isArray(rec.images) ? (rec.images as unknown[]) : [];
  const out: { frontUrl?: string; backUrl?: string; leftUrl?: string; rightUrl?: string } = {};
  for (const im of imagesRaw) {
    if (!isRecord(im)) continue;
    const src = getString(im.src) || getString(im.url);
    const pos = getString(im.position) || getString(im.type) || getString(im.view);
    if (!src || !pos) continue;
    const p = pos.toLowerCase();
    if (!out.frontUrl && p.includes('front')) out.frontUrl = src;
    else if (!out.backUrl && p.includes('back')) out.backUrl = src;
    else if (!out.leftUrl && p.includes('left')) out.leftUrl = src;
    else if (!out.rightUrl && p.includes('right')) out.rightUrl = src;
  }
  return out;
}

async function tryFinalizeMockups(params: { shopId: string; productId: string }) {
  const product = await printifyFetch(`/v1/shops/${params.shopId}/products/${params.productId}.json`);
  const urls = extractMockupUrls(product);
  return urls;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const designHash = url.searchParams.get('designHash') || '';
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ success: false, error: 'supabase_not_configured' }, { status: 500 });
  if (!designHash) return NextResponse.json({ success: false, error: 'missing_design_hash' }, { status: 400 });

  const { data, error } = await supabase.from('design_mockups').select('*').eq('design_hash', designHash).single();
  if (error || !data) return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });

  return NextResponse.json({ success: true, ...normalizeMockupsRow(data as Record<string, unknown>) }, { status: 200 });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as unknown;
  const b = isRecord(body) ? (body as Record<string, unknown>) : {};
  const imageUrl = getString(b.imageUrl).trim();
  const prompt = getString(b.prompt).trim();
  const printType = getString(b.printType).trim();

  if (!imageUrl) return NextResponse.json({ success: false, error: 'missing_image_url' }, { status: 400 });

  const designHash = computeDesignHash({ imageUrl, prompt });
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ success: false, error: 'supabase_not_configured' }, { status: 500 });

  let reuseExistingRow = false;
  const { data: existing } = await supabase.from('design_mockups').select('*').eq('design_hash', designHash).single();
  if (existing && isRecord(existing)) {
    const normalized = normalizeMockupsRow(existing);
    if (
      normalized.status === 'ready' &&
      normalized.mockups.frontUrl &&
      normalized.mockups.backUrl &&
      normalized.mockups.leftUrl &&
      normalized.mockups.rightUrl
    ) {
      return NextResponse.json({ success: true, ...normalized }, { status: 200 });
    }
    const shopId = (process.env.PRINTIFY_SHOP_ID || '').trim();
    if (!shopId) return NextResponse.json({ success: true, ...normalized }, { status: 200 });
    if (normalized.printifyProductId && (normalized.status === 'pending' || normalized.status === 'generating')) {
      try {
        const urls = await tryFinalizeMockups({ shopId, productId: normalized.printifyProductId });
        if (urls.frontUrl && urls.backUrl && urls.leftUrl && urls.rightUrl) {
          await supabase
            .from('design_mockups')
            .update({
              status: 'ready',
              mockup_front_url: urls.frontUrl,
              mockup_back_url: urls.backUrl,
              mockup_left_url: urls.leftUrl,
              mockup_right_url: urls.rightUrl,
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq('design_hash', designHash);
          return NextResponse.json(
            { success: true, designHash, status: 'ready', mockups: urls, printifyProductId: normalized.printifyProductId },
            { status: 200 },
          );
        }
      } catch {
      }
    }
    if (normalized.status === 'pending' || normalized.status === 'generating') {
      return NextResponse.json({ success: true, ...normalized }, { status: 200 });
    }
    if (normalized.status === 'error') {
      reuseExistingRow = true;
    }
  }

  const shopId = (process.env.PRINTIFY_SHOP_ID || '').trim();
  if (!shopId) return NextResponse.json({ success: false, error: 'missing_printify_shop_id' }, { status: 500 });

  const origin = new URL(req.url).origin;
  const fetchUrl = imageUrl.startsWith('/') ? `${origin}${imageUrl}` : imageUrl;
  const preferredTemplateId =
    printType === 'all_over_print'
      ? (process.env.PRINTIFY_AOP_TEMPLATE_PRODUCT_ID || '').trim()
      : (process.env.PRINTIFY_TEMPLATE_PRODUCT_ID || '').trim();

  try {
    const nowIso = new Date().toISOString();
    if (reuseExistingRow) {
      await supabase
        .from('design_mockups')
        .update({
          image_url: imageUrl,
          prompt: prompt || null,
          status: 'generating',
          error_message: null,
          mockup_front_url: null,
          mockup_back_url: null,
          mockup_left_url: null,
          mockup_right_url: null,
          printify_product_id: null,
          updated_at: nowIso,
        })
        .eq('design_hash', designHash);
    } else {
      await supabase
        .from('design_mockups')
        .insert({
          design_hash: designHash,
          image_url: imageUrl,
          prompt: prompt || null,
          status: 'generating',
          updated_at: nowIso,
        })
        .select('design_hash')
        .single();
    }

    const base64 = await fetchImageAsBase64(fetchUrl);
    const fileSafe = designHash.slice(0, 12);
    const uploaded = await uploadImageToPrintify(`mockup-${fileSafe}-${Date.now().toString(36)}.png`, base64);

    const template = await getTemplateProduct(shopId, preferredTemplateId);
    const blueprintId = getNumber(template.blueprint_id);
    const printProviderId = getNumber(template.print_provider_id);
    if (!Number.isFinite(blueprintId) || !Number.isFinite(printProviderId)) throw new Error('printify_template_missing_blueprint');

    const variantIds = getVariantIds(template);
    const primaryVariantId = variantIds[0];
    const positions = getAllPlaceholderPositions(template, primaryVariantId);
    const frontPos = pickPlaceholderPosition(positions, 'front') || 'front';
    const frontTransform = getTransformFromTemplate(template, primaryVariantId, frontPos);

    const isAop = printType === 'all_over_print';
    const appliedPlacements: string[] = [];
    const skippedPlacements: string[] = [];

    const title = `Mockup ${fileSafe}`.slice(0, 60);
    let placeholders: Array<{ position: string; images: Array<{ id: string; x: number; y: number; scale: number; angle: number }> }>;

    if (isAop) {
      const front = getPlacementMatch(template, primaryVariantId, ['front', 'chest']);
      const back = getPlacementMatch(template, primaryVariantId, ['back', 'rear']);
      const leftSleeve = getPlacementMatch(template, primaryVariantId, ['left_sleeve', 'left sleeve']);
      const rightSleeve = getPlacementMatch(template, primaryVariantId, ['right_sleeve', 'right sleeve']);

      const requiredPlacements = [
        ['front', front],
        ['back', back],
        ['left_sleeve', leftSleeve],
        ['right_sleeve', rightSleeve],
      ] as const;

      const missingRequired = requiredPlacements.find(([, match]) => !match);
      if (missingRequired) {
        throw new Error(`required_aop_placement_missing:${missingRequired[0]}`);
      }

      placeholders = requiredPlacements.map(([name, match]) => {
        appliedPlacements.push(name);
        return {
          position: match!.key,
          images: [
            {
              id: uploaded.id,
              x: match!.transform.x,
              y: match!.transform.y,
              scale: match!.transform.scale,
              angle: match!.transform.angle,
            },
          ],
        };
      });

      const insideNeckTag = getPlacementMatch(template, primaryVariantId, ['inside_neck_tag', 'inside neck tag', 'inside_label']);
      if (insideNeckTag) {
        const logoUpload = await uploadSiteLogoToPrintify(fileSafe);
        placeholders.push({
          position: insideNeckTag.key,
          images: [
            {
              id: logoUpload.id,
              x: insideNeckTag.transform.x,
              y: insideNeckTag.transform.y,
              scale: insideNeckTag.transform.scale,
              angle: insideNeckTag.transform.angle,
            },
          ],
        });
        appliedPlacements.push('inside_neck_tag');
      } else {
        skippedPlacements.push('inside_neck_tag');
      }

      const collarPlacement = getPlacementMatch(template, primaryVariantId, ['collar', 'neck']);
      if (collarPlacement && !matchesAlias(collarPlacement.key, ['inside_neck_tag', 'inside neck tag', 'inside_label'])) {
        skippedPlacements.push('neck_accent_supported_but_not_applied');
      } else {
        skippedPlacements.push('neck_accent');
      }
    } else {
      placeholders = [
        {
          position: frontPos,
          images: [{ id: uploaded.id, x: frontTransform.x, y: frontTransform.y, scale: frontTransform.scale, angle: frontTransform.angle }],
        },
      ];
      appliedPlacements.push('front');
    }

    const bodyPayload = {
      title,
      description: (prompt ? `Auto-generated mockup product.\nPrompt: ${prompt}` : 'Auto-generated mockup product.').slice(0, 500),
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variants: variantIds.slice(0, 50).map((id) => ({ id, price: 4999, is_enabled: true })),
      print_areas: [
        {
          variant_ids: variantIds.slice(0, 50),
          placeholders,
        },
      ],
    };

    const created = (await printifyFetch(`/v1/shops/${shopId}/products.json`, { method: 'POST', body: JSON.stringify(bodyPayload) })) as unknown;
    const productId = isRecord(created) ? getString(created.id) : '';
    if (!productId) throw new Error('printify_product_create_missing_id');

    await supabase
      .from('design_mockups')
      .update({ printify_product_id: productId, status: 'pending', error_message: null, updated_at: new Date().toISOString() })
      .eq('design_hash', designHash);

    for (let i = 0; i < 10; i++) {
      const urls = await tryFinalizeMockups({ shopId, productId });
      if (urls.frontUrl && urls.backUrl && urls.leftUrl && urls.rightUrl) {
        await supabase
          .from('design_mockups')
          .update({
            status: 'ready',
            mockup_front_url: urls.frontUrl,
            mockup_back_url: urls.backUrl,
            mockup_left_url: urls.leftUrl,
            mockup_right_url: urls.rightUrl,
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('design_hash', designHash);
        return NextResponse.json(
          {
            success: true,
            designHash,
            status: 'ready',
            mockups: urls,
            printifyProductId: productId,
            meta: {
              appliedPlacements,
              skippedPlacements,
            },
          },
          { status: 200 },
        );
      }
      await sleep(1500);
    }

    return NextResponse.json(
      {
        success: true,
        designHash,
        status: 'pending',
        mockups: { frontUrl: undefined, backUrl: undefined, leftUrl: undefined, rightUrl: undefined },
        printifyProductId: productId,
        meta: {
          appliedPlacements,
          skippedPlacements,
        },
      },
      { status: 200 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || 'unknown_error');
    await supabase
      .from('design_mockups')
      .update({ status: 'error', error_message: msg.slice(0, 500), updated_at: new Date().toISOString() })
      .eq('design_hash', designHash);
    return NextResponse.json({ success: false, error: 'mockup_generation_failed', details: msg }, { status: 500 });
  }
}
