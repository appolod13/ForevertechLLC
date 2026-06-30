'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShoppingBag, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { OrderRecord } from '@/lib/cartStore';
import { creatorAccessConstants, getCreatorAccess } from '@/lib/creatorAccess';
import type { StoredGenerationRecord } from '@/lib/creatorArtifacts';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [savedGenerations, setSavedGenerations] = useState<StoredGenerationRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const access = getCreatorAccess(user);

  useEffect(() => {
    if (!user) return;

    const upgrade = (searchParams.get('upgrade') || '').trim();
    if (upgrade !== 'premium-creator') return;

    const nextUser = { ...user, premiumCreator: true };
    try {
      localStorage.setItem('user', JSON.stringify(nextUser));
    } catch {
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;

    try {
      const raw = localStorage.getItem('foreverteck.studio.savedGenerations');
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      setSavedGenerations(Array.isArray(parsed) ? (parsed as StoredGenerationRecord[]) : []);
    } catch {
      setSavedGenerations([]);
    }

    const load = async () => {
      setLoadingData(true);
      try {
        const deviceId = localStorage.getItem('device_id') || 'anonymous';
        const params = new URLSearchParams();
        if (user.id) params.set('userId', String(user.id));
        if (deviceId) params.set('deviceId', deviceId);
        const res = await fetch(`/api/orders?${params.toString()}`);
        const data: unknown = await res.json().catch(() => null);
        const d = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {};
        const list = Array.isArray(d.orders) ? (d.orders as OrderRecord[]) : [];
        setOrders(list);
      } catch {
        setOrders([]);
      } finally {
        setLoadingData(false);
      }
    };
    load();
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
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">{access.hasPremiumCreatorAccess ? 'Premium Creator' : 'Free Tier'}</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                {access.hasPremiumCreatorAccess
                  ? '75% payout active. Creator-linked sales, QR listings, and expanded source-record storage are available on this account.'
                  : 'You can store up to 5 free generations. Upgrade to Premium Creator to unlock QR selling, 75% creator payouts, and expanded storage.'}
              </p>
            </div>

            <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-wider text-zinc-500">Stored Generations</div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {savedGenerations.length} / {access.hasPremiumCreatorAccess ? 'Unlimited' : creatorAccessConstants.FREE_STORAGE_LIMIT}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-wider text-zinc-500">Creator Payout</div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {access.hasPremiumCreatorAccess ? '75% payout active' : 'Upgrade required'}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Previous Purchases
          </h2>
          
          {loadingData ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
          ) : orders.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order) => {
                const first = order.items[0];
                const imageUrl = first?.imageUrl || '/placeholder-future-city.svg';
                const title = first?.title || 'Purchase';
                const date = new Date(order.createdAt).toLocaleDateString();
                const price = typeof order.total === 'number' ? order.total : undefined;
                return (
                <div key={order.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black mb-4">
                    <img
                      src={imageUrl}
                      alt={title}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <div className="mt-2 flex justify-between text-sm text-zinc-400">
                    <span>{date}</span>
                    <span className="text-white font-medium">{typeof price === 'number' ? `$${price.toFixed(2)}` : ''}</span>
                  </div>
                  {order.printifyOrderId && (
                    <div className="mt-2 text-xs text-zinc-500">Printify: {order.printifyOrderId}</div>
                  )}
                </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
                You haven&apos;t purchased anything yet.
              </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Saved AI Generations
          </h2>
          {savedGenerations.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {savedGenerations.map((generation) => (
                <div key={generation.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="relative mb-4 aspect-square overflow-hidden rounded-lg bg-black">
                    <img
                      src={generation.imageUrl}
                      alt={generation.prompt}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="text-sm font-semibold text-white">{generation.prompt}</div>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>{new Date(generation.createdAt).toLocaleDateString()}</span>
                    <span>{generation.storedVia === 'quantum_paid' ? 'Quantum record' : generation.storedVia === 'premium_creator' ? 'Premium creator' : 'Free storage'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
              Designs you like will be saved here for long-term access.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
