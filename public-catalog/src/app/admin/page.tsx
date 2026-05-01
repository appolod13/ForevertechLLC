"use client";

import Link from "next/link";

function Card({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 hover:bg-zinc-900/40 transition-colors">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/60">{desc}</div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="text-xl font-semibold">Master Control Center</div>
        <div className="mt-1 text-sm text-white/60">Manage generators, Printify text, crypto mint settings, and shipping.</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card href="/admin/ai-generators" title="AI Generators" desc="Enable/disable providers, set URLs and timeouts." />
        <Card href="/admin/printify-back-text" title="Printify Back Text" desc="Control back-of-shirt word collage text and styling." />
        <Card href="/admin/crypto" title="Crypto Setup" desc="Configure chains, contract addresses, and gasless claim settings." />
        <Card href="/admin/shipping" title="Shipping" desc="Configure shipping quote rules used at checkout." />
      </div>
    </div>
  );
}
