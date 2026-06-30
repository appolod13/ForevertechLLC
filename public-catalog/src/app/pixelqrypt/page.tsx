'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Download, Lock, Shirt, Zap } from 'lucide-react';

type PixelQryptLookup = {
  hiddenMessage: string;
  galleryItemId: string;
  quantumJobId?: string | null;
  quantumSeedHash?: string | null;
  imageUrl: string;
  prompt: string;
  creatorUserId?: string | null;
  creatorStripeAccountId?: string | null;
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function downloadAsset(params: { url: string; filename: string }) {
  const a = document.createElement('a');
  a.href = params.url;
  a.download = params.filename;
  a.target = '_blank';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function PixelQryptContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = (searchParams.get('code') || '').trim();
  const sessionIdFromUrl = (searchParams.get('session_id') || '').trim();

  const [code, setCode] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [lookup, setLookup] = useState<PixelQryptLookup | null>(null);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [lookupError, setLookupError] = useState('');

  const [buyStatus, setBuyStatus] = useState<'idle' | 'starting' | 'redirecting' | 'error'>('idle');
  const [buyError, setBuyError] = useState('');

  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'checking' | 'purchased' | 'not_purchased' | 'error'>('idle');
  const [purchaseError, setPurchaseError] = useState('');

  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'error'>('idle');
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    let id = '';
    try {
      id = localStorage.getItem('device_id') || '';
      if (!id) {
        id = generateUUID();
        localStorage.setItem('device_id', id);
      }
    } catch {
      id = 'anonymous';
    }
    setDeviceId(id);
  }, []);

  useEffect(() => {
    if (codeFromUrl && !code) setCode(codeFromUrl);
  }, [codeFromUrl, code]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const c = code.trim();
      if (!c) {
        setLookup(null);
        setLookupStatus('idle');
        setLookupError('');
        return;
      }
      setLookupStatus('loading');
      setLookupError('');
      try {
        const res = await fetch(`/api/pixelqrypt?code=${encodeURIComponent(c)}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          if (cancelled) return;
          setLookup(null);
          setLookupStatus('error');
          setLookupError(String(json?.error || `HTTP_${res.status}`));
          return;
        }
        if (cancelled) return;
        setLookup(json as unknown as PixelQryptLookup & { success: true });
        setLookupStatus('ready');
      } catch (e: unknown) {
        if (cancelled) return;
        setLookup(null);
        setLookupStatus('error');
        setLookupError(e instanceof Error ? e.message : 'lookup_failed');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!code.trim() || !sessionIdFromUrl.trim()) return;
      if (!deviceId) return;
      setPurchaseStatus('checking');
      setPurchaseError('');
      try {
        const params = new URLSearchParams();
        params.set('code', code.trim());
        params.set('session_id', sessionIdFromUrl.trim());
        params.set('deviceId', deviceId);
        const res = await fetch(`/api/pixelqrypt/purchase?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.success) {
          setPurchaseStatus(res.status === 402 ? 'not_purchased' : 'error');
          setPurchaseError(String(json?.error || `HTTP_${res.status}`));
          return;
        }
        setPurchaseStatus('purchased');
      } catch (e: unknown) {
        if (cancelled) return;
        setPurchaseStatus('error');
        setPurchaseError(e instanceof Error ? e.message : 'purchase_check_failed');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [code, sessionIdFromUrl, deviceId]);

  const canDownload = purchaseStatus === 'purchased';
  const isCreatorLinkedSale = Boolean(lookup?.creatorUserId);

  const customizeHref = useMemo(() => {
    if (!lookup?.imageUrl) return '/customize';
    const u = new URL('/customize', 'http://local');
    u.searchParams.set('imageUrl', lookup.imageUrl);
    if (lookup.prompt) u.searchParams.set('prompt', lookup.prompt);
    return `${u.pathname}?${u.searchParams.toString()}`;
  }, [lookup?.imageUrl, lookup?.prompt]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8">
          <div className="flex items-center gap-3 text-purple-300">
            <Zap className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-wider">PixelQrypt™</span>
          </div>
          <h1 className="mt-3 text-4xl font-bold">Unlock a hidden message</h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-300">
            Paste a PixelQrypt™ verification code. If you scanned a QR code, it should auto-fill.
          </p>

          <div className="mt-6 grid gap-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-zinc-500 mb-1">Verification code</div>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="PQ-..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-3 text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-1 flex items-end gap-3">
                <Link
                  href="/gallery"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-black/40 px-4 py-3 text-sm font-semibold text-white hover:bg-black/55 border border-white/10 backdrop-blur-md transition-colors"
                >
                  View Gallery
                </Link>
              </div>
            </div>

            {lookupStatus === 'error' && lookupError ? (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {lookupError}
              </div>
            ) : null}

            {lookupStatus === 'loading' ? (
              <div className="text-sm text-zinc-400">Loading…</div>
            ) : null}

            {lookup && lookupStatus === 'ready' ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-black/40 overflow-hidden">
                  <div className="aspect-square bg-zinc-900">
                    <img src={lookup.imageUrl} alt="PixelQrypt asset" className="h-full w-full object-contain" />
                  </div>
                  <div className="p-4 border-t border-zinc-800">
                    <div className="text-xs font-semibold text-zinc-500">Prompt</div>
                    <div className="mt-1 text-sm text-zinc-200 whitespace-pre-wrap">{lookup.prompt}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
                    <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                      <Lock className="h-4 w-4 text-purple-300" />
                      Hidden Message
                    </div>
                    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-white whitespace-pre-wrap">
                      {lookup.hiddenMessage}
                    </div>
                  </div>

                  {isCreatorLinkedSale ? (
                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                      <div className="text-sm font-semibold text-white">Creator-linked sale</div>
                      <div className="mt-2 text-sm text-purple-100/90">
                        This QR unlock is tied to a creator listing. One-time buyer access lets collectors purchase this code or artwork without subscribing.
                      </div>
                    </div>
                  ) : null}

                  {purchaseStatus === 'error' && purchaseError ? (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {purchaseError}
                    </div>
                  ) : null}

                  {buyStatus === 'error' && buyError ? (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {buyError}
                    </div>
                  ) : null}

                  {downloadStatus === 'error' && downloadError ? (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {downloadError}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3">
                    {canDownload ? (
                      <button
                        onClick={async () => {
                          if (!lookup?.imageUrl) return;
                          setDownloadStatus('downloading');
                          setDownloadError('');
                          try {
                            downloadAsset({ url: lookup.imageUrl, filename: `pixelqrypt-${code.trim() || 'asset'}.png` });
                            setDownloadStatus('idle');
                          } catch (e: unknown) {
                            setDownloadStatus('error');
                            setDownloadError(e instanceof Error ? e.message : 'download_failed');
                          }
                        }}
                        disabled={downloadStatus === 'downloading'}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        {downloadStatus === 'downloading' ? 'Downloading…' : 'Download File'}
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!lookup) return;
                          setBuyStatus('starting');
                          setBuyError('');
                          try {
                            const res = await fetch('/api/pixelqrypt/checkout', {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({
                                code: code.trim(),
                                deviceId,
                                galleryItemId: lookup.galleryItemId,
                                creatorUserId: lookup.creatorUserId || '',
                                creatorStripeAccountId: lookup.creatorStripeAccountId || '',
                              }),
                            });
                            const json = await res.json().catch(() => null);
                            if (!res.ok || !json?.url) {
                              setBuyStatus('error');
                              setBuyError(String(json?.error || `HTTP_${res.status}`));
                              return;
                            }
                            setBuyStatus('redirecting');
                            window.location.href = String(json.url);
                          } catch (e: unknown) {
                            setBuyStatus('error');
                            setBuyError(e instanceof Error ? e.message : 'checkout_failed');
                          }
                        }}
                        disabled={buyStatus === 'starting' || buyStatus === 'redirecting' || !deviceId}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        {buyStatus === 'starting' ? 'Starting checkout…' : isCreatorLinkedSale ? 'Buy This Code / Artwork' : 'Purchase Download Access'}
                      </button>
                    )}

                    <Link
                      href={customizeHref}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-black/40 px-4 py-3 text-sm font-semibold text-white hover:bg-black/55 border border-white/10 backdrop-blur-md transition-colors"
                    >
                      <Shirt className="h-4 w-4" />
                      Put on T-Shirt
                    </Link>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-300">
                    {isCreatorLinkedSale
                      ? 'One-time buyer access is delivered instantly after a successful payment. For help with creator-linked purchases, access, or refund questions, see '
                      : 'Download access is delivered instantly after a successful payment. For help with access or refund questions, see '}
                    <Link className="text-blue-300 hover:text-blue-200" href="/refund-policy">
                      Refund & Return Policy
                    </Link>{" "}
                    or contact{" "}
                    <a className="text-blue-300 hover:text-blue-200" href="mailto:support@forevertech.tech">
                      support@forevertech.tech
                    </a>
                    .
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PixelQryptPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white"><Header /><main className="container mx-auto px-4 py-10">Loading…</main></div>}>
      <PixelQryptContent />
    </Suspense>
  );
}
