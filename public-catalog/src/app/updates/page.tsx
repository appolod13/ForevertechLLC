import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Rss, GitCommit, Sparkles, ArrowRight } from 'lucide-react';
import { getSiteUpdates, getPublicDesigns, absoluteUrl } from '@/lib/seo';

// Refresh automatically so new commits/drops appear without a redeploy.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Updates — What\'s New at PixelQrypt',
  description:
    'Live changelog of new features, fixes, and one-of-one quantum fractal drops at PixelQrypt. Subscribe via RSS to follow along.',
  alternates: {
    canonical: '/updates',
    types: { 'application/rss+xml': absoluteUrl('/feed.xml') },
  },
  openGraph: {
    title: 'Updates — What\'s New at PixelQrypt',
    description: 'Follow new features and fresh quantum fractal drops as they ship.',
    url: absoluteUrl('/updates'),
    images: [absoluteUrl('/api/og?title=' + encodeURIComponent('What\u2019s New') + '&subtitle=' + encodeURIComponent('Live updates & fresh drops'))],
  },
};

function timeAgo(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const day = 86_400_000;
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`;
  if (diff < day) return `${Math.round(diff / 3_600_000)}h ago`;
  if (diff < 30 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default async function UpdatesPage() {
  const [updates, designs] = await Promise.all([getSiteUpdates(20), getPublicDesigns(8)]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <header className="mb-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-balance">What&apos;s New</h1>
              <p className="text-zinc-400 max-w-xl text-pretty">
                Every feature, fix, and fresh quantum fractal drop as it ships. Follow along to catch new
                one-of-one designs before they&apos;re gone.
              </p>
            </div>
            <a
              href="/feed.xml"
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-3 text-sm font-semibold transition-colors min-h-[44px]"
            >
              <Rss className="w-4 h-4" /> Subscribe via RSS
            </a>
          </div>
        </header>

        {/* Latest drops */}
        {designs.length > 0 && (
          <section className="mb-14" aria-labelledby="drops-heading">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 id="drops-heading" className="text-xl font-semibold">
                Latest Drops
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {designs.map((d) => (
                <Link
                  key={d.id}
                  href={`/customize?imageUrl=${encodeURIComponent(d.imageUrl)}&prompt=${encodeURIComponent(d.prompt)}`}
                  className="group block rounded-xl overflow-hidden border border-zinc-800 hover:border-purple-600/60 transition-colors"
                >
                  <div className="relative aspect-square bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.imageUrl}
                      alt={d.prompt}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-zinc-400 line-clamp-2">{d.prompt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Changelog */}
        <section aria-labelledby="changelog-heading">
          <div className="flex items-center gap-2 mb-5">
            <GitCommit className="w-5 h-5 text-emerald-400" />
            <h2 id="changelog-heading" className="text-xl font-semibold">
              Changelog
            </h2>
          </div>

          {updates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
              <p className="text-zinc-400">
                Updates will appear here automatically as new changes ship. Subscribe via RSS to get notified.
              </p>
            </div>
          ) : (
            <ol className="relative border-l border-zinc-800 ml-3">
              {updates.map((u) => (
                <li key={u.id} className="mb-8 ml-6">
                  <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-zinc-950" />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-base font-semibold text-white">{u.title}</h3>
                    <time className="text-xs text-zinc-500">{timeAgo(u.date)}</time>
                  </div>
                  {u.description && <p className="mt-1 text-sm text-zinc-400 text-pretty">{u.description}</p>}
                  <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                    <span>by {u.author}</span>
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300"
                    >
                      View change <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
