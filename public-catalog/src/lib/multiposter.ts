export type PosterPlatformKey =
  | 'twitter'
  | 'telegram'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'reddit'
  | 'discord'
  | 'rss';

export type PosterPlatformState = {
  status: 'connected' | 'needs_connection' | 'available' | 'warning';
  label: string;
  authenticated: boolean;
  publishable: boolean;
};

export const POSTER_PLATFORM_ORDER: PosterPlatformKey[] = [
  'twitter',
  'telegram',
  'instagram',
  'tiktok',
  'youtube',
  'reddit',
  'discord',
  'rss',
];

export const POSTER_PLATFORM_NAMES: Record<PosterPlatformKey, string> = {
  twitter: 'Twitter',
  telegram: 'Telegram',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  reddit: 'Reddit',
  discord: 'Discord',
  rss: 'RSS',
};

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function buildPosterPlatformState(platform: PosterPlatformKey, authenticated: boolean): PosterPlatformState {
  if (platform === 'rss') {
    return {
      status: authenticated ? 'available' : 'warning',
      label: authenticated ? 'RSS available' : 'RSS unavailable',
      authenticated,
      publishable: authenticated,
    };
  }

  const name = POSTER_PLATFORM_NAMES[platform];
  return {
    status: authenticated ? 'connected' : 'needs_connection',
    label: authenticated ? `${name} connected` : `${name} needs connection`,
    authenticated,
    publishable: authenticated,
  };
}

export function createPosterPlatformMap<T>(buildValue: (platform: PosterPlatformKey) => T): Record<PosterPlatformKey, T> {
  return POSTER_PLATFORM_ORDER.reduce(
    (acc, platform) => {
      acc[platform] = buildValue(platform);
      return acc;
    },
    {} as Record<PosterPlatformKey, T>,
  );
}

export function buildPosterPlatformStates(value: unknown): Record<PosterPlatformKey, PosterPlatformState> {
  const session = isRecord(value) ? value : {};
  return createPosterPlatformMap((platform) => {
    const platformSession = isRecord(session[platform]) ? session[platform] : {};
    return buildPosterPlatformState(platform, platformSession.authenticated === true);
  });
}

export function buildPosterHref({
  origin,
  imageUrl,
  text,
  prompt,
}: {
  origin: string;
  imageUrl?: string | null;
  text?: string | null;
  prompt?: string | null;
}) {
  const href = new URL('/poster', origin);
  const safeImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  const safeText = typeof text === 'string' ? text.trim() : '';
  const safePrompt = typeof prompt === 'string' ? prompt.trim() : '';

  if (safeImageUrl) href.searchParams.set('shareImage', safeImageUrl);
  if (safeText) href.searchParams.set('shareText', safeText);
  if (safePrompt) href.searchParams.set('sharePrompt', safePrompt.slice(0, 600));

  return href.toString();
}
