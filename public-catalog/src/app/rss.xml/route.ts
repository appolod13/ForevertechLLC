import { NextResponse } from 'next/server';

import { getServiceSupabase } from '@/lib/supabase';

function xmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function getSiteUrl(request: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  const siteUrl = getSiteUrl(request);
  const now = new Date().toUTCString();

  let items: Array<{ id: string; title?: string | null; content?: string | null; media_url?: string | null; created_at?: string | null }> =
    [];

  if (supabase) {
    const { data } = await supabase.from('poster_posts').select('id,title,content,media_url,created_at').order('created_at', { ascending: false }).limit(50);
    if (Array.isArray(data)) items = data;
  }

  const rssItems = items
    .map((item) => {
      const title = xmlEscape((item.title || item.content || 'PixelQrypt Post').trim());
      const description = xmlEscape((item.content || '').trim());
      const guid = `${siteUrl}/rss/${encodeURIComponent(item.id)}`;
      const pubDate = new Date(item.created_at || Date.now()).toUTCString();
      const enclosure = item.media_url
        ? `<enclosure url="${xmlEscape(item.media_url)}" type="image/png" />`
        : '';
      return `<item><title>${title}</title><description>${description}</description><guid>${guid}</guid><pubDate>${pubDate}</pubDate>${enclosure}</item>`;
    })
    .join('');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0"><channel><title>PixelQrypt Poster Feed</title><link>${siteUrl}/rss.xml</link>` +
    `<description>Recent Multi-Channel Poster posts</description><lastBuildDate>${now}</lastBuildDate>${rssItems}</channel></rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
