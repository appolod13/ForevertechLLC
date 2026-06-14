import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
  escapeXml,
  getPublicDesigns,
  getSiteUpdates,
} from '@/lib/seo';

// Cache the feed for 30 minutes; aggregators/blogs poll it for fresh drops.
export const revalidate = 1800;

interface FeedEntry {
  title: string;
  link: string;
  guid: string;
  description: string;
  date: Date;
  imageUrl?: string;
  category: string;
}

export async function GET() {
  const [designs, updates] = await Promise.all([getPublicDesigns(30), getSiteUpdates(15)]);

  const designEntries: FeedEntry[] = designs.map((d) => ({
    title: `New drop: ${d.prompt.slice(0, 80)}${d.isQuantumVerified ? ' (PixelQrypt™ Verified)' : ''}`,
    link: absoluteUrl(`/customize?imageUrl=${encodeURIComponent(d.imageUrl)}&prompt=${encodeURIComponent(d.prompt)}`),
    guid: `design-${d.id}`,
    description: `A one-of-one quantum fractal design by ${d.userName}. "${d.prompt}" — generated from words and printed once, never repeated. Wear it before it's gone.`,
    date: new Date(d.createdAt),
    imageUrl: d.imageUrl,
    category: 'New Design',
  }));

  const updateEntries: FeedEntry[] = updates.map((u) => ({
    title: `Site update: ${u.title}`,
    link: u.url,
    guid: `update-${u.id}`,
    description: u.description || u.title,
    date: new Date(u.date),
    category: 'Product Update',
  }));

  const entries = [...designEntries, ...updateEntries]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 40);

  const lastBuild = entries[0]?.date ?? new Date();

  const items = entries
    .map((e) => {
      const enclosure = e.imageUrl
        ? `\n      <enclosure url="${escapeXml(e.imageUrl)}" type="image/png" />\n      <media:content url="${escapeXml(e.imageUrl)}" medium="image" />`
        : '';
      return `    <item>
      <title>${escapeXml(e.title)}</title>
      <link>${escapeXml(e.link)}</link>
      <guid isPermaLink="false">${escapeXml(e.guid)}</guid>
      <category>${escapeXml(e.category)}</category>
      <pubDate>${e.date.toUTCString()}</pubDate>
      <description>${escapeXml(e.description)}</description>${enclosure}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} — ${escapeXml(SITE_TAGLINE)}</title>
    <link>${SITE_URL}</link>
    <atom:link href="${absoluteUrl('/feed.xml')}" rel="self" type="application/rss+xml" />
    <description>New one-of-one quantum fractal apparel drops and product updates from ${escapeXml(SITE_NAME)}.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
