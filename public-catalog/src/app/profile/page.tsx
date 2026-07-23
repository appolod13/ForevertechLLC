'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { OrderRecord } from '@/lib/cartStore';
import { creatorAccessConstants, getCreatorAccess } from '@/lib/creatorAccess';
import type { StoredGenerationRecord } from '@/lib/creatorArtifacts';

function ProfilePageInner() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [savedGenerations, setSavedGenerations] = useState<StoredGenerationRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const access = getCreatorAccess(user);

  const highlightPremiumUpgrade = (searchParams.get('upgrade') || '').trim() === 'premium-creator';
  const creatorSessionId = (searchParams.get('creator_session_id') || '').trim();
  const [premiumCheckoutStatus, setPremiumCheckoutStatus] = useState<'idle' | 'starting' | 'redirecting' | 'error'>('idle');
  const [premiumCheckoutError, setPremiumCheckoutError] = useState('');
  const [premiumConfirmStatus, setPremiumConfirmStatus] = useState<'idle' | 'checking' | 'error'>('idle');
  const [premiumConfirmError, setPremiumConfirmError] = useState('');
  const [connectStatus, setConnectStatus] = useState<'idle' | 'starting' | 'redirecting' | 'error'>('idle');
  const [connectError, setConnectError] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [discordWebhookDisplay, setDiscordWebhookDisplay] = useState('');
  const [discordStatus, setDiscordStatus] = useState<'idle' | 'saving' | 'deleting' | 'error'>('idle');
  const [discordError, setDiscordError] = useState('');
  const [selectedGenerationIds, setSelectedGenerationIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const loadDiscord = async () => {
      try {
        const res = await fetch(`/api/social/discord?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (cancelled || !json?.success) return;
        setDiscordWebhookDisplay(typeof json.webhookDisplay === 'string' ? json.webhookDisplay : '');
      } catch {
      }
    };
    loadDiscord();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !creatorSessionId) return;
    if (premiumConfirmStatus !== 'idle') return;

    let cancelled = false;
    const run = async () => {
      setPremiumConfirmStatus('checking');
      setPremiumConfirmError('');
      try {
        const params = new URLSearchParams();
        params.set('session_id', creatorSessionId);
        params.set('userId', user.id);
        const res = await fetch(`/api/creator/premium/confirm?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          if (cancelled) return;
          setPremiumConfirmStatus('error');
          setPremiumConfirmError(String(json?.error || `HTTP_${res.status}`));
          return;
        }
        try {
          const nextUser = { ...user, premiumCreator: true };
          localStorage.setItem('user', JSON.stringify(nextUser));
        } catch {
        }
        if (!cancelled) {
          window.location.replace('/profile');
        }
      } catch (e: unknown) {
        if (cancelled) return;
        setPremiumConfirmStatus('error');
        setPremiumConfirmError(e instanceof Error ? e.message : 'confirm_failed');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [creatorSessionId, premiumConfirmStatus, user]);

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

  const toggleGenerationSelection = (generationId: string) => {
    setSelectedGenerationIds((prev) =>
      prev.includes(generationId) ? prev.filter((id) => id !== generationId) : [...prev, generationId],
    );
  };

  const deleteSelectedGenerations = () => {
    if (!selectedGenerationIds.length) return;
    setSavedGenerations((prev) => {
      const next = prev.filter((generation) => !selectedGenerationIds.includes(generation.id));
      try {
        localStorage.setItem('foreverteck.studio.savedGenerations', JSON.stringify(next));
      } catch {
      }
      return next;
    });
    setSelectedGenerationIds([]);
  };

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
                  ? '45% payout active. Creator-linked sales, QR listings, and expanded source-record storage are available on this account.'
                  : 'You can store up to 5 free generations. Upgrade to Premium Creator to unlock QR selling, 45% creator payouts, and expanded storage.'}
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
                  {access.hasPremiumCreatorAccess ? '45% payout active' : 'Upgrade required'}
                </div>
              </div>
            </div>
          </div>
          {user.stripeConnectAccountId ? (
            <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-sm font-semibold text-white">Stripe Express connected</div>
              <div className="mt-2 text-sm text-emerald-100/90">
                Creator payout onboarding is linked for this account. Manual creator payout records can now point to your connected Stripe Express account.
              </div>
              <div className="mt-3 text-xs text-emerald-100/80">{user.stripeConnectAccountId}</div>
            </div>
          ) : null}
          {highlightPremiumUpgrade && !access.hasPremiumCreatorAccess ? (
            <div className="mt-5 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
              <div className="text-sm font-semibold text-white">Premium Creator upgrade selected.</div>
              <div className="mt-2 text-sm text-purple-100/90">
                Connect Stripe Express for future creator payouts, then activate your Premium Creator subscription to unlock 45% creator payouts and QR-linked selling.
              </div>

              {premiumConfirmStatus === 'checking' ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200">
                  Activating Premium Creator…
                </div>
              ) : null}

              {premiumConfirmStatus === 'error' && premiumConfirmError ? (
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {premiumConfirmError}
                </div>
              ) : null}

              {premiumCheckoutStatus === 'error' && premiumCheckoutError ? (
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {premiumCheckoutError}
                </div>
              ) : null}

              {connectStatus === 'error' && connectError ? (
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {connectError}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={connectStatus === 'starting' || connectStatus === 'redirecting' || !user}
                  onClick={async () => {
                    if (!user) return;
                    setConnectStatus('starting');
                    setConnectError('');
                    try {
                      const res = await fetch('/api/creator/connect/onboard', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, email: user.email }),
                      });
                      const json = await res.json().catch(() => null);
                      if (!res.ok || !json?.url) {
                        setConnectStatus('error');
                        setConnectError(String(json?.error || `HTTP_${res.status}`));
                        return;
                      }
                      setConnectStatus('redirecting');
                      window.location.href = String(json.url);
                    } catch (e: unknown) {
                      setConnectStatus('error');
                      setConnectError(e instanceof Error ? e.message : 'connect_failed');
                    }
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 bg-black/40 px-4 py-2 text-sm font-semibold text-white hover:bg-black/55 disabled:opacity-50"
                >
                  Connect Stripe Express
                </button>
                <button
                  type="button"
                  disabled={
                    premiumCheckoutStatus === 'starting' ||
                    premiumCheckoutStatus === 'redirecting' ||
                    premiumConfirmStatus === 'checking' ||
                    !user
                  }
                  onClick={async () => {
                    if (!user) return;
                    setPremiumCheckoutStatus('starting');
                    setPremiumCheckoutError('');
                    try {
                      const res = await fetch('/api/creator/premium/checkout', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, email: user.email }),
                      });
                      const json = await res.json().catch(() => null);
                      if (!res.ok || !json?.url) {
                        setPremiumCheckoutStatus('error');
                        setPremiumCheckoutError(String(json?.error || `HTTP_${res.status}`));
                        return;
                      }
                      setPremiumCheckoutStatus('redirecting');
                      window.location.href = String(json.url);
                    } catch (e: unknown) {
                      setPremiumCheckoutStatus('error');
                      setPremiumCheckoutError(e instanceof Error ? e.message : 'checkout_failed');
                    }
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-purple-300/30 bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                >
                  Activate Premium Creator
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-2xl font-semibold text-white">Discord Webhook</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Manage the per-user Discord destination used by the Multi-Channel Poster.
          </p>
          {discordWebhookDisplay ? (
            <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100">
              {discordWebhookDisplay}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-400">
              No Discord webhook connected yet.
            </div>
          )}
          {discordError ? (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {discordError}
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              value={discordWebhook}
              onChange={(e) => setDiscordWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="min-h-[44px] flex-1 rounded-lg border border-zinc-700 bg-black/40 px-4 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={!user || discordStatus === 'saving'}
              onClick={async () => {
                if (!user) return;
                setDiscordStatus('saving');
                setDiscordError('');
                try {
                  const res = await fetch('/api/social/discord', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, webhookUrl: discordWebhook }),
                  });
                  const json = await res.json().catch(() => null);
                  if (!res.ok || !json?.success) {
                    setDiscordStatus('error');
                    setDiscordError(String(json?.error || `HTTP_${res.status}`));
                    return;
                  }
                  setDiscordStatus('idle');
                  setDiscordWebhook('');
                  setDiscordWebhookDisplay(String(json.webhookDisplay || 'Discord connected'));
                } catch (e: unknown) {
                  setDiscordStatus('error');
                  setDiscordError(e instanceof Error ? e.message : 'discord_save_failed');
                }
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-indigo-300/30 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Save Discord Webhook
            </button>
            <button
              type="button"
              disabled={!user || !discordWebhookDisplay || discordStatus === 'deleting'}
              onClick={async () => {
                if (!user) return;
                setDiscordStatus('deleting');
                setDiscordError('');
                try {
                  const res = await fetch(`/api/social/discord?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
                  const json = await res.json().catch(() => null);
                  if (!res.ok || !json?.success) {
                    setDiscordStatus('error');
                    setDiscordError(String(json?.error || `HTTP_${res.status}`));
                    return;
                  }
                  setDiscordStatus('idle');
                  setDiscordWebhookDisplay('');
                } catch (e: unknown) {
                  setDiscordStatus('error');
                  setDiscordError(e instanceof Error ? e.message : 'discord_delete_failed');
                }
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 bg-black/40 px-4 py-2 text-sm font-semibold text-white hover:bg-black/55 disabled:opacity-50"
            >
              Remove Discord Webhook
            </button>
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
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-primary" />
              Saved AI Generations
            </h2>
            <button
              type="button"
              disabled={!selectedGenerationIds.length}
              onClick={deleteSelectedGenerations}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete Selected
            </button>
          </div>
          {savedGenerations.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {savedGenerations.map((generation) => (
                <div key={generation.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-300">
                    <input
                      type="checkbox"
                      checked={selectedGenerationIds.includes(generation.id)}
                      onChange={() => toggleGenerationSelection(generation.id)}
                      aria-label={`Select saved generation ${generation.prompt}`}
                      className="h-4 w-4 accent-red-500"
                    />
                    Select
                  </label>
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

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ProfilePageInner />
    </Suspense>
  );
}
