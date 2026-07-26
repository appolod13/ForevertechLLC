import sharp from 'sharp';

export type GarmentZone = 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | 'inside_neck_tag' | 'collar';

type ZoneAsset = {
  fileName: string;
  buffer: Buffer;
  mimeType: 'image/png';
};

type ComposeAopGarmentAssetsInput = {
  designBuffer: Buffer;
  logoBuffer?: Buffer | null;
  fileSafe: string;
  brandingSource?: string;
};

type BrandingLogoOptions = {
  explicitLogoUrl?: string;
  metadata?: Record<string, unknown> | null;
  origin?: string;
  fallbackLogoUrl?: string;
};

type BrandingLogoResolution = {
  url: string;
  source: 'explicit_logo_url' | 'metadata_logo_url' | 'fallback_logo_url';
} | null;

type ComposeAopGarmentAssetsResult = {
  zoneAssets: Record<GarmentZone, ZoneAsset>;
  meta: {
    brandingSource: string;
  };
};

function asTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toAbsoluteUrl(url: string, origin?: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!origin) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function extractMetadataLogoUrl(metadata?: Record<string, unknown> | null) {
  if (!metadata) return '';
  const candidates = [
    metadata.logoUrl,
    metadata.brandLogoUrl,
    metadata.insideTagLogoUrl,
    metadata.logo_url,
    metadata.brand_logo_url,
  ];
  for (const candidate of candidates) {
    const next = asTrimmedString(candidate);
    if (next) return next;
  }
  return '';
}

export function resolveBrandingLogoUrl(options: BrandingLogoOptions): BrandingLogoResolution {
  const explicitLogoUrl = asTrimmedString(options.explicitLogoUrl);
  if (explicitLogoUrl) {
    return {
      url: toAbsoluteUrl(explicitLogoUrl, options.origin),
      source: 'explicit_logo_url',
    };
  }

  const metadataLogoUrl = extractMetadataLogoUrl(options.metadata);
  if (metadataLogoUrl) {
    return {
      url: toAbsoluteUrl(metadataLogoUrl, options.origin),
      source: 'metadata_logo_url',
    };
  }

  const fallbackLogoUrl = asTrimmedString(options.fallbackLogoUrl);
  if (fallbackLogoUrl) {
    return {
      url: toAbsoluteUrl(fallbackLogoUrl, options.origin),
      source: 'fallback_logo_url',
    };
  }

  return null;
}

async function sliceZone(base: sharp.Sharp, left: number, top: number, width: number, height: number) {
  return base
    .clone()
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
}

export async function composeAopGarmentAssets(
  input: ComposeAopGarmentAssetsInput,
): Promise<ComposeAopGarmentAssetsResult> {
  const normalized = sharp(input.designBuffer).resize(2400, 2400, { fit: 'cover', position: 'centre' });

  const front = await sliceZone(normalized, 250, 200, 1400, 1800);
  const back = await sliceZone(normalized, 750, 200, 1400, 1800);
  const leftSleeve = await sliceZone(normalized, 0, 500, 900, 900);
  const rightSleeve = await sliceZone(normalized, 1500, 500, 900, 900);
  const collar = await sliceZone(normalized, 800, 0, 800, 320);

  const logoBuffer =
    input.logoBuffer && input.logoBuffer.length
      ? await sharp(input.logoBuffer).resize(900, 360, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer()
      : await sharp({
          create: {
            width: 900,
            height: 360,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          },
        })
          .png()
          .toBuffer();

  return {
    zoneAssets: {
      front: { fileName: `${input.fileSafe}-front.png`, buffer: front, mimeType: 'image/png' },
      back: { fileName: `${input.fileSafe}-back.png`, buffer: back, mimeType: 'image/png' },
      left_sleeve: { fileName: `${input.fileSafe}-left-sleeve.png`, buffer: leftSleeve, mimeType: 'image/png' },
      right_sleeve: { fileName: `${input.fileSafe}-right-sleeve.png`, buffer: rightSleeve, mimeType: 'image/png' },
      inside_neck_tag: { fileName: `${input.fileSafe}-inside-tag.png`, buffer: logoBuffer, mimeType: 'image/png' },
      collar: { fileName: `${input.fileSafe}-collar.png`, buffer: collar, mimeType: 'image/png' },
    },
    meta: {
      brandingSource: input.brandingSource || (input.logoBuffer ? 'explicit_logo_url' : 'fallback_logo_url'),
    },
  };
}
