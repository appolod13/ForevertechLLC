'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [finalizeStatus, setFinalizeStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [printifyOrderId, setPrintifyOrderId] = useState<string>('');
  const didRun = useRef(false);

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
