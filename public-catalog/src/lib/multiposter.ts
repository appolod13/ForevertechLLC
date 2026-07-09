export type PosterPlatformKey = 'reddit' | 'discord' | 'rss';

export type PosterPlatformState = {
  status: 'connected' | 'needs_connection' | 'available' | 'warning';
  label: string;
  authenticated: boolean;
};

export const POSTER_PLATFORM_NAMES: Record<PosterPlatformKey, string> = {
  reddit: 'Reddit',
  discord: 'Discord',
  rss: 'RSS',
};

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function buildPosterPlatformStates(value: unknown): Record<PosterPlatformKey, PosterPlatformState> {
  const session = isRecord(value) ? value : {};

  const reddit = isRecord(session.reddit) ? session.reddit : {};
  const discord = isRecord(session.discord) ? session.discord : {};
  const rss = isRecord(session.rss) ? session.rss : {};

  const redditAuthenticated = reddit.authenticated === true;
  const discordAuthenticated = discord.authenticated === true;
  const rssAuthenticated = rss.authenticated === true;

  return {
    reddit: {
      status: redditAuthenticated ? 'connected' : 'needs_connection',
      label: redditAuthenticated ? 'Reddit connected' : 'Reddit needs connection',
      authenticated: redditAuthenticated,
    },
    discord: {
      status: discordAuthenticated ? 'connected' : 'needs_connection',
      label: discordAuthenticated ? 'Discord connected' : 'Discord needs connection',
      authenticated: discordAuthenticated,
    },
    rss: {
      status: rssAuthenticated ? 'available' : 'warning',
      label: rssAuthenticated ? 'RSS available' : 'RSS unavailable',
      authenticated: rssAuthenticated,
    },
  };
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
