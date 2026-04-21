'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ShoppingBag, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    // Mock fetching previous purchases/saved images for the user
    if (user) {
      setTimeout(() => {
        setPurchases([
          {
            id: 'mock-1',
            title: 'Quantum Julia Set (Size: L)',
            imageUrl: '/placeholder-future-city.svg',
            date: new Date().toLocaleDateString(),
            price: 49.99
          }
        ]);
        setLoadingData(false);
      }, 1000);
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 border-b border-zinc-800 pb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
        <p className="text-zinc-400">Welcome back, {user.name}. View your saved designs and past purchases.</p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Previous T-Shirt Purchases
          </h2>
          
          {loadingData ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
          ) : purchases.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {purchases.map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black mb-4">
                    <Image src={item.imageUrl} alt={item.title} fill className="object-cover" unoptimized />
                  </div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <div className="mt-2 flex justify-between text-sm text-zinc-400">
                    <span>{item.date}</span>
                    <span className="text-white font-medium">${item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
              You haven't purchased any T-Shirts yet.
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Saved AI Generations
          </h2>
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
            Designs you like will be saved here for long-term access.
          </div>
        </section>
      </div>
    </div>
  );
}
