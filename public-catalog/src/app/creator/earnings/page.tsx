'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

// Defaults mirror the live pricing/share config.
// Override creator share with PIXELQRYPT_CREATOR_SHARE_BPS (basis points).
const CREATOR_SHARE = 0.75; // 75% to creator
const DEFAULT_DOWNLOAD_PRICE = 24.99; // premium digital download
const STRIPE_PERCENT = 0.029; // ~2.9% + 30c per transaction
const STRIPE_FLAT = 0.3;

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function CreatorEarningsPage() {
  const [price, setPrice] = useState<number>(DEFAULT_DOWNLOAD_PRICE);
  const [sales, setSales] = useState<number>(50);

  const perSaleCreator = useMemo(() => price * CREATOR_SHARE, [price]);
  const perSalePlatformGross = useMemo(() => price * (1 - CREATOR_SHARE), [price]);
  const perSaleStripeFee = useMemo(() => price * STRIPE_PERCENT + STRIPE_FLAT, [price]);
  const perSalePlatformNet = useMemo(
    () => Math.max(0, perSalePlatformGross - perSaleStripeFee),
    [perSalePlatformGross, perSaleStripeFee],
  );

  const totalCreator = useMemo(() => perSaleCreator * sales, [perSaleCreator, sales]);
  const totalPlatformNet = useMemo(() => perSalePlatformNet * sales, [perSalePlatformNet, sales]);
  const totalRevenue = useMemo(() => price * sales, [price, sales]);

  const presets = [10, 50, 100, 500, 1000];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-balance text-2xl font-bold leading-relaxed sm:text-3xl">Creator Earnings Calculator</h1>
          <p className="text-pretty leading-relaxed text-slate-300">
            See exactly what you earn. Every time someone buys a design you created, you keep{' '}
            <span className="font-semibold text-fuchsia-400">75%</span> of the sale — automatically, paid through Stripe.
          </p>
        </header>

        <section className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-200">Design price (USD)</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">$</span>
              <input
                type="number"
                min={1}
                max={1000}
                step={1}
                inputMode="decimal"
                value={Number.isFinite(price) ? price : ''}
                onChange={(e) => setPrice(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 outline-none focus:border-fuchsia-500"
              />
            </div>
          </label>

          <div className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-200">Number of sales</span>
            <input
              type="range"
              min={1}
              max={2000}
              step={1}
              value={sales}
              onChange={(e) => setSales(Number(e.target.value))}
              className="w-full accent-fuchsia-500"
              aria-label="Number of sales"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl font-bold text-slate-100">{sales.toLocaleString('en-US')}</span>
              <span className="text-slate-400">sales</span>
              <div className="ml-auto flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSales(p)}
                    className={`min-h-[36px] rounded-lg border px-3 text-xs font-medium transition-colors ${
                      sales === p
                        ? 'border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-300'
                        : 'border-slate-700 text-slate-300 hover:border-fuchsia-500'
                    }`}
                  >
                    {p.toLocaleString('en-US')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-600/15 to-indigo-600/10 p-6">
            <span className="text-sm font-medium text-fuchsia-300">You earn (creator, 75%)</span>
            <span className="text-3xl font-bold text-slate-50">{money(totalCreator)}</span>
            <span className="text-xs text-slate-400">{money(perSaleCreator)} per sale</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <span className="text-sm font-medium text-slate-300">Total sales volume</span>
            <span className="text-3xl font-bold text-slate-50">{money(totalRevenue)}</span>
            <span className="text-xs text-slate-400">{money(price)} per design</span>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-sm font-semibold text-slate-200">How the split works</h2>
          <ul className="flex flex-col gap-2 text-sm text-slate-300">
            <li className="flex items-center justify-between gap-3">
              <span>Creator share (75%)</span>
              <span className="font-semibold text-fuchsia-300">{money(perSaleCreator)}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Platform share (25%)</span>
              <span className="font-semibold text-slate-200">{money(perSalePlatformGross)}</span>
            </li>
            <li className="flex items-center justify-between gap-3 text-slate-400">
              <span>Est. Stripe fee per sale</span>
              <span>-{money(perSaleStripeFee)}</span>
            </li>
          </ul>
          <p className="text-pretty text-xs leading-relaxed text-slate-500">
            Estimates only. Final amounts depend on Stripe processing fees and your live price. Payouts are sent
            automatically to your connected Stripe account.
          </p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/creator/payouts"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:from-fuchsia-500 hover:to-indigo-500"
          >
            Connect payout account
          </Link>
          <Link
            href="/studio"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-fuchsia-500"
          >
            Create a design
          </Link>
        </div>
      </div>
    </main>
  );
}
