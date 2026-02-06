import { Header } from '@/components/Header';
import { CatalogGrid } from '@/components/CatalogGrid';
import { TwitterFeed } from '@/components/TwitterFeed';
import { LatestAIImage } from '@/components/LatestAIImage';
import Image from 'next/image';

async function getPosts() {
  try {
    const res = await fetch('http://localhost:3001/api/catalog/posts', { 
      cache: 'no-store' 
    });
    if (!res.ok) {
      throw new Error('Failed to fetch posts');
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format');
    }
    const data = await res.json();
    return data.posts || [];
  } catch (error) {
    console.error('Error fetching initial posts:', error);
    return [];
  }
}

export default async function Home() {
  const initialPosts = await getPosts();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      <Header />
      <main className="space-y-12 pb-12">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Main Hero - Future City */}
            <div className="relative col-span-1 md:col-span-2 aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 shadow-2xl shadow-primary/10 group">
              <Image
                src="/placeholder-future-city.svg"
                alt="ForeverTech Future City"
                fill
                priority
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-8">
                <div className="max-w-xl">
                  <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg mb-2">
                    The Future of <span className="text-primary">Decentralized</span> Tech
                  </h1>
                  <p className="text-zinc-300 text-sm md:text-base line-clamp-2">
                    Build your decentralized presence with IPFS hosting, blockchain verification, and Web3 monetization.
                  </p>
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
                  Latest Generation
                </span>
              </div>
              <LatestAIImage />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                 <p className="text-sm font-medium text-white">AI Generated Art</p>
                 <p className="text-xs text-zinc-400">Fresh from the neural network</p>
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
