import type { MetadataRoute } from 'next';
import { SITE_URL, getPublicDesigns } from '@/lib/seo';

// Revalidate the sitemap periodically so new designs get indexed without redeploys.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Public, indexable marketing + storefront pages.
  const staticPaths: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/', priority: 1.0, changeFrequency: 'daily' },
    { path: '/studio', priority: 0.9, changeFrequency: 'daily' },
    { path: '/gallery', priority: 0.8, changeFrequency: 'daily' },
    { path: '/pixelqrypt', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/updates', priority: 0.7, changeFrequency: 'daily' },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/faqs', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/support', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/creator/payouts', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/refund-policy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/shipping-policy', priority: 0.3, changeFrequency: 'yearly' },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // Dynamic design pages (deep links into the customizer for each public design).
  const designs = await getPublicDesigns(100);
  const designEntries: MetadataRoute.Sitemap = designs.map((d) => ({
    url: `${SITE_URL}/customize?imageUrl=${encodeURIComponent(d.imageUrl)}&prompt=${encodeURIComponent(d.prompt)}`,
    lastModified: d.createdAt ? new Date(d.createdAt) : now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticEntries, ...designEntries];
}
