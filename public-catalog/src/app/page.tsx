import { Header } from '@/components/Header';
import { CatalogGrid } from '@/components/CatalogGrid';
import { TwitterFeed } from '@/components/TwitterFeed';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

type CatalogPost = {
  id: string;
  content: string;
  ipfsHash?: string;
  timestamp: string;
  metadata?: { title?: string; mediaUrl?: string; prompt?: string; [key: string]: unknown };
};

function resolvePostMediaUrl(post: CatalogPost | undefined): string | null {
  if (!post) return null;
  const raw =
    (post.metadata && typeof post.metadata.mediaUrl === 'string' ? post.metadata.mediaUrl : null) || null;
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('Qm') || raw.startsWith('bafy')) return `https://ipfs.io/ipfs/${raw}`;
  return `${raw.startsWith('/') ? '' : '/'}${raw}`;
}

async function getInitialPosts(): Promise<CatalogPost[]> {
  try {
    const imagesDir = path.join(process.cwd(), '..', 'quantum-image-gen', 'images');
    const files = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
    const imageFiles = files.filter((f) => f.endsWith('.png')).sort((a, b) => b.localeCompare(a));

    const posts = imageFiles.map((file, index) => {
      const parts = file.split('_');
      const timestampStr = parts[0];

      let date = new Date();
      if (timestampStr && timestampStr.length >= 15) {
        const y = timestampStr.substring(0, 4);
        const m = timestampStr.substring(4, 6);
        const d = timestampStr.substring(6, 8);
        const h = timestampStr.substring(9, 11);
        const min = timestampStr.substring(11, 13);
        const s = timestampStr.substring(13, 15);
        date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
      }

      const ipfsHash = index < 3 ? `QmSeeded${String(index + 1).padStart(2, '0')}` : undefined;

      return {
        id: file,
        content: `Quantum Generated Asset - ${parts.length > 2 ? parts[2].replace('.png', '') : 'Image'}`,
        timestamp: date.toISOString(),
        ipfsHash,
        metadata: {
          title: `Quantum Asset ${file.substring(0, 8)}`,
          mediaUrl: `/api/images/${encodeURIComponent(file)}`,
          priceUsd: 49.99,
          prompt: 'seeded',
        },
      } satisfies CatalogPost;
    });

    if (posts.length === 0 && process.env.NODE_ENV !== 'production') {
      return [
        {
          id: 'seed-post-1',
          content: 'Seeded Quantum Generated Asset',
          timestamp: new Date().toISOString(),
          ipfsHash: 'QmSeeded01',
          metadata: {
            title: 'Quantum Asset Seed',
            mediaUrl: '/placeholder-future-city.svg',
            priceUsd: 49.99,
            prompt: 'seeded',
          },
        },
      ];
    }

    return posts;
  } catch {
    return [];
  }
}

export default async function Home() {
  const initialPosts = await getInitialPosts();
  const heroPost = initialPosts[0];
  const heroImageUrl = resolvePostMediaUrl(heroPost);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      <Header />
      <main className="space-y-12 pb-12">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Main Hero - Latest Drop */}
            <div className="relative col-span-1 md:col-span-2 aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 shadow-2xl shadow-primary/10 group">
              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt="Latest published design"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="eager"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.20),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.12),transparent_55%)]" />
              )}
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10">
                  Latest Build
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-8">
                <div className="max-w-xl">
                  <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg mb-2">
                    BannerBuild Julia: <span className="text-primary">Emotional</span> Math Art to Merch
                  </h1>
                  <p className="text-zinc-300 text-sm md:text-base line-clamp-2">
                    Your words become numbers, and your numbers become a Julia + Mandelbrot design you can preview on a T-shirt, publish to your gallery, and buy with card checkout.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link
                      href="/studio"
                      className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
                    >
                      Create in Studio
                    </Link>
                    <Link
                      href="/gallery"
                      className="inline-flex items-center justify-center rounded-lg bg-black/40 px-4 py-2 text-sm font-semibold text-white hover:bg-black/55 border border-white/10 backdrop-blur-md transition-colors"
                    >
                      View Your Gallery
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Hero - Latest AI Generation */}
            <div className="relative col-span-1 aspect-video md:aspect-auto w-full overflow-hidden rounded-2xl border border-zinc-800 shadow-xl bg-zinc-900 flex flex-col">
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10">
                  <span className="mr-1.5 relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Newest Generation
                </span>
              </div>
              <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.10),transparent_55%)]" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                 <p className="text-sm font-medium text-white">Prompt-to-Image Output</p>
                 <p className="text-xs text-zinc-400">Ready to customize, print, and ship</p>
              </div>
            </div>
          </div>
        </section>

        <CatalogGrid initialPosts={initialPosts} />
        
        <section className="container mx-auto px-4 border-t border-gray-800 pt-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Social Updates</h2>
            <p className="text-gray-400">Real-time updates from our official X account</p>
          </div>
          <TwitterFeed />
        </section>
      </main>
    </div>
  );
}
