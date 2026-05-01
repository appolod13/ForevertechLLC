'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

type ChainConfig = {
  id: string;
  name: string;
  chainId: number;
  enabled: boolean;
  gaslessClaim: boolean;
  contractAddress: string;
  mintFunction: string;
};

type CryptoConfig = {
  version: string;
  primaryChainId: number;
  chains: ChainConfig[];
};

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [finalizeStatus, setFinalizeStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [printifyOrderId, setPrintifyOrderId] = useState<string>('');
  const didRun = useRef(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [claimStatus, setClaimStatus] = useState<'idle' | 'claiming' | 'claimed' | 'error'>('idle');
  const [claimError, setClaimError] = useState<string>('');
  const [claimTxHash, setClaimTxHash] = useState<string>('');
  const [metadataIpfsUrl, setMetadataIpfsUrl] = useState<string>('');
  const [cryptoCfg, setCryptoCfg] = useState<CryptoConfig | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<number>(56);

  useEffect(() => {
    if (!sessionId) return;
    if (process.env.NODE_ENV === 'production') return;
    if (didRun.current) return;
    didRun.current = true;

    const run = async () => {
      setFinalizeStatus('running');
      try {
        const res = await fetch('/api/stripe/webhook', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-dev-bypass': '1',
          },
          body: JSON.stringify({
            id: `evt_dev_${Date.now()}`,
            object: 'event',
            api_version: '2026-03-25.dahlia',
            created: Math.floor(Date.now() / 1000),
            type: 'checkout.session.completed',
            data: { object: { id: sessionId, object: 'checkout.session' } },
          }),
        });

        if (!res.ok) {
          setFinalizeStatus('error');
          return;
        }

        const deviceId = localStorage.getItem('device_id') || 'anonymous';
        const ordersRes = await fetch(`/api/orders?deviceId=${encodeURIComponent(deviceId)}`);
        const ordersJson: unknown = await ordersRes.json().catch(() => null);
        const o = (typeof ordersJson === 'object' && ordersJson !== null) ? (ordersJson as Record<string, unknown>) : {};
        const orders = Array.isArray(o.orders) ? (o.orders as Array<Record<string, unknown>>) : [];
        const match = orders.find((ord) => typeof ord?.stripeSessionId === 'string' && ord.stripeSessionId === sessionId);
        const poid = match && typeof match.printifyOrderId === 'string' ? match.printifyOrderId : '';
        setPrintifyOrderId(poid);
        setFinalizeStatus('done');
      } catch {
        setFinalizeStatus('error');
      }
    };

    run();
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const res = await fetch('/api/crypto/config', { cache: 'no-store' }).catch(() => null);
      const json: unknown = res ? await res.json().catch(() => null) : null;
      const ok = Boolean(res && res.ok && isRecord(json) && json.success === true && isRecord(json.data));
      if (!ok) {
        if (!cancelled) setCryptoCfg(null);
        return;
      }
      const data = (json as Record<string, unknown>).data as Record<string, unknown>;
      const cfg = data as unknown as CryptoConfig;
      if (cancelled) return;
      setCryptoCfg(cfg);
      const enabledChains = Array.isArray(cfg.chains) ? cfg.chains.filter((c) => c && c.enabled) : [];
      const preferred = enabledChains.find((c) => c.chainId === cfg.primaryChainId) || enabledChains[0] || null;
      setSelectedChainId(preferred?.chainId ?? 56);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const enabledChains = cryptoCfg?.chains?.filter((c) => c.enabled) || [];
  const selectedChain = enabledChains.find((c) => c.chainId === selectedChainId) || null;
  const canGaslessClaim = Boolean(selectedChain && selectedChain.gaslessClaim);

  if (!sessionId) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Invalid Session</h1>
        <Link href="/" className="text-primary hover:underline">Go back to shopping</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center max-w-lg">
      <div className="rounded-full bg-emerald-500/10 p-6 mb-6">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
      <p className="text-zinc-400 mb-8">
        Thank you for your purchase. Your payment has been processed successfully via Stripe.
      </p>
      {process.env.NODE_ENV !== 'production' && (
        <div className="mb-8 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left text-sm text-zinc-300">
          <div className="flex justify-between gap-3">
            <span className="text-zinc-400">Order finalize (dev)</span>
            <span>
              {finalizeStatus === 'running'
                ? 'Finalizing…'
                : finalizeStatus === 'done'
                  ? 'Done'
                  : finalizeStatus === 'error'
                    ? 'Error'
                    : 'Idle'}
            </span>
          </div>
          {printifyOrderId ? (
            <div className="mt-2 text-xs text-zinc-400">Printify Order ID: {printifyOrderId}</div>
          ) : null}
        </div>
      )}

      <div className="mb-8 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left">
        <div className="text-sm font-semibold text-white">Claim your NFT</div>
        <div className="mt-1 text-xs text-zinc-400">
          {selectedChain
            ? selectedChain.gaslessClaim
              ? `Gasless claim on ${selectedChain.name}.`
              : `${selectedChain.name} requires gas (claim disabled here).`
            : 'Select a chain to claim.'}
        </div>
        {enabledChains.length ? (
          <div className="mt-3 grid gap-1">
            <div className="text-xs text-zinc-500">Chain</div>
            <select
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none"
              value={String(selectedChainId)}
              onChange={(e) => setSelectedChainId(Number(e.target.value))}
              disabled={claimStatus === 'claiming' || claimStatus === 'claimed'}
            >
              {enabledChains.map((c) => (
                <option key={c.id || String(c.chainId)} value={String(c.chainId)}>
                  {c.name} (chainId {c.chainId}){c.gaslessClaim ? ' • gasless' : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none"
            placeholder="0x..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            disabled={claimStatus === 'claiming' || claimStatus === 'claimed'}
          />
          <button
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
            disabled={!walletAddress.trim() || claimStatus === 'claiming' || claimStatus === 'claimed' || !canGaslessClaim}
            onClick={async () => {
              if (!sessionId) return;
              setClaimStatus('claiming');
              setClaimError('');
              setClaimTxHash('');
              setMetadataIpfsUrl('');
              try {
                const res = await fetch('/api/nft/claim', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({
                    sessionId,
                    walletAddress: walletAddress.trim(),
                    chainId: selectedChainId,
                    deviceId: localStorage.getItem('device_id') || '',
                  }),
                });
                const json = await res.json().catch(() => null);
                if (!res.ok || !json?.success) {
                  setClaimStatus('error');
                  setClaimError(String(json?.error || `HTTP_${res.status}`));
                  return;
                }
                setClaimStatus('claimed');
                setClaimTxHash(String(json.data?.txHash || ''));
                setMetadataIpfsUrl(String(json.data?.metadataIpfsUrl || ''));
              } catch (e: unknown) {
                setClaimStatus('error');
                setClaimError(e instanceof Error ? e.message : 'claim_failed');
              }
            }}
          >
            {claimStatus === 'claiming' ? 'Claiming…' : claimStatus === 'claimed' ? 'Claimed' : 'Claim'}
          </button>
        </div>
        {claimError ? <div className="mt-2 text-xs text-red-300">{claimError}</div> : null}
        {claimTxHash ? <div className="mt-2 text-xs text-zinc-400 break-all">Tx: {claimTxHash}</div> : null}
        {metadataIpfsUrl ? <div className="mt-1 text-xs text-zinc-400 break-all">Metadata: {metadataIpfsUrl}</div> : null}
      </div>

      <Link 
        href="/" 
        className="rounded-full bg-white px-8 py-3 font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-24 text-center text-zinc-400">Loading…</div>}>
      <CheckoutSuccessInner />
    </Suspense>
  );
}
