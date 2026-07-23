import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(request?: Request) {
  const cookieStore = await cookies();

  const url = request ? new URL(request.url) : null;
  const userId = getString(url?.searchParams.get('userId'));

  const platforms = ['twitter', 'telegram', 'instagram', 'tiktok', 'youtube', 'reddit'];
  const session: Record<string, { authenticated: boolean; screenName?: string }> = {};

  for (const p of platforms) {
    const token = cookieStore.get(`${p}_user_token`)?.value;
    const refreshToken = cookieStore.get(`${p}_user_refresh_token`)?.value;
    const screenName = cookieStore.get(`${p}_screen_name`)?.value;

    const envTelegramReady =
      p === 'telegram' && Boolean((process.env.TELEGRAM_BOT_TOKEN || '').trim()) && Boolean((process.env.TELEGRAM_CHAT_ID || '').trim());

    const hasRedditSession = p === 'reddit' && Boolean((refreshToken || '').trim());

    if (token || hasRedditSession || envTelegramReady) {
      session[p] = { authenticated: true, screenName: screenName || p };
    } else {
      session[p] = { authenticated: false };
    }
  }

  let discordConnected = false;
  if (userId) {
    const supabase = getServiceSupabase({ requireServiceRole: true });
    if (supabase) {
      const { data } = await supabase
        .from('user_social_destinations')
        .select('webhook_url')
        .eq('user_id', userId)
        .eq('platform', 'discord')
        .maybeSingle();
      discordConnected = Boolean(getString((data as { webhook_url?: unknown } | null)?.webhook_url));
    }
  }
  session.discord = discordConnected ? { authenticated: true, screenName: 'Discord connected' } : { authenticated: false };

  const rssEnabled = Boolean(getServiceSupabase({ requireServiceRole: true }));
  session.rss = rssEnabled ? { authenticated: true, screenName: 'RSS feed' } : { authenticated: false };

  return NextResponse.json(session);
}
