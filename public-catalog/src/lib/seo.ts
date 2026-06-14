import { getServiceSupabase } from '@/lib/supabase';

// Canonical public site used across all SEO surfaces (sitemap, RSS, OG tags).
// Matches the metadataBase configured in app/layout.tsx.
export const SITE_URL = 'https://www.pixelqrypt.com';
export const SITE_NAME = 'PixelQrypt';
export const SITE_TAGLINE = 'One-of-one quantum fractal art you can wear';

/** Builds an absolute URL on the canonical site from a relative path. */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}

/** Escapes a string for safe inclusion inside XML (RSS / sitemap) text nodes. */
export function escapeXml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface PublicDesign {
  id: string;
  imageUrl: string;
  prompt: string;
  userName: string;
  createdAt: string;
  isQuantumVerified?: boolean;
}

/**
 * Returns the most recent public gallery designs for use in the sitemap and RSS
 * feed. Reads directly from Supabase (service client) and fails soft to [] so the
 * SEO routes never crash the site, even if the DB is unreachable.
 */
export async function getPublicDesigns(limit = 50): Promise<PublicDesign[]> {
  try {
    const supabase = getServiceSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('gallery_items')
      .select('id, image_url, prompt, user_name, created_at, is_quantum_verified')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !Array.isArray(data)) return [];
    return data
      .filter((item) => item && typeof item.image_url === 'string' && !item.image_url.startsWith('<svg'))
      .map((item) => ({
        id: String(item.id),
        imageUrl: String(item.image_url),
        prompt: String(item.prompt || 'Quantum fractal design'),
        userName: String(item.user_name || 'PixelQrypt Artist'),
        createdAt: String(item.created_at || new Date().toISOString()),
        isQuantumVerified: Boolean(item.is_quantum_verified),
      }));
  } catch {
    return [];
  }
}

export interface SiteUpdate {
  id: string;
  title: string;
  description: string;
  url: string;
  date: string;
  author: string;
}

const GITHUB_REPO = 'appolod13/ForevertechLLC';

/**
 * Pulls the latest public commits from the connected GitHub repo so the site can
 * show a live "Updates" feed that refreshes automatically as changes ship.
 * Uses GITHUB_TOKEN when available (higher rate limit / private repos) and falls
 * back to [] on any error so the page/feed always renders.
 */
export async function getSiteUpdates(limit = 20): Promise<SiteUpdate[]> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'pixelqrypt-site',
    };
    const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=${Math.min(50, Math.max(1, limit))}`,
      { headers, next: { revalidate: 1800 } },
    );
    if (!res.ok) return [];
    const commits = (await res.json()) as Array<{
      sha: string;
      html_url: string;
      commit: { message: string; author?: { name?: string; date?: string } };
      author?: { login?: string };
    }>;
    if (!Array.isArray(commits)) return [];

    return commits
      // Hide noisy automated/merge commits from the public feed.
      .filter((c) => {
        const msg = c?.commit?.message || '';
        return msg && !/^merge\b/i.test(msg) && !/^\s*$/.test(msg);
      })
      .map((c) => {
        const fullMessage = c.commit.message || '';
        const [title, ...rest] = fullMessage.split('\n');
        return {
          id: c.sha,
          title: title.trim().slice(0, 120),
          description: rest.join(' ').trim().slice(0, 280),
          url: c.html_url,
          date: c.commit.author?.date || new Date().toISOString(),
          author: c.author?.login || c.commit.author?.name || 'ForeverTech',
        };
      });
  } catch {
    return [];
  }
}
