'use client';

import { useEffect, useState } from 'react';

type Status = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  transfersActive: boolean;
} | null;

export default function CreatorPayoutsPage() {
  const [email, setEmail] = useState('');
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Pick up the account id Stripe returns us after onboarding.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const fromUrl = sp.get('account');
    const stored = window.localStorage.getItem('pixelqrypt_creator_account');
    const id = fromUrl || stored || '';
    if (id) {
      setAccountId(id);
      window.localStorage.setItem('pixelqrypt_creator_account', id);
    }
  }, []);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/stripe/connect?accountId=${encodeURIComponent(accountId)}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && json) setStatus(json as Status);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  async function connect() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), accountId: accountId || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        setError(json?.error || 'Could not start onboarding');
        setBusy(false);
        return;
      }
      if (json.accountId) window.localStorage.setItem('pixelqrypt_creator_account', String(json.accountId));
      window.location.href = String(json.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'connect_failed');
      setBusy(false);
    }
  }

  const ready = Boolean(status?.payoutsEnabled && status?.transfersActive);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-balance text-2xl font-bold leading-relaxed sm:text-3xl">Creator Payouts</h1>
          <p className="text-pretty leading-relaxed text-slate-300">
            Connect your account to earn <span className="font-semibold text-fuchsia-400">75%</span> every time someone
            scans your shirt&apos;s QR code and buys your design. Payouts are handled securely by Stripe.
          </p>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-200">Email</span>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 outline-none focus:border-fuchsia-500"
            />
          </label>

          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:from-fuchsia-500 hover:to-indigo-500 disabled:opacity-50"
          >
            {busy ? 'Opening Stripe…' : accountId ? 'Continue onboarding' : 'Connect payout account'}
          </button>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </section>

        {accountId ? (
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-200">Your payout account</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  ready ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {ready ? 'Ready for payouts' : 'Setup incomplete'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                {accountId}
              </code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(accountId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="min-h-[44px] rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-200 hover:border-fuchsia-500"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <p className="text-pretty text-xs leading-relaxed text-slate-400">
              Attach this account ID to your published designs so sales route 75% to you automatically. If status shows
              &quot;Setup incomplete,&quot; finish the Stripe steps above.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
