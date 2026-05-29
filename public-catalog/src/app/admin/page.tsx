"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AdminOrderRow = {
  key: string;
  order: {
    id: string;
    createdAt: string;
    total?: number;
    printifyOrderId?: string;
    quantumVerified?: boolean;
    quantumRefunded?: boolean;
    quantumProof?: { provider: "ibm"; jobId: string; backend: string; seed: string; shots?: number; createdAt: string };
    items: Array<{ title?: string; quantity: number; metadata?: Record<string, unknown> }>;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getQuantumFrontMeta(items: AdminOrderRow["order"]["items"]) {
  for (const it of items) {
    const m = it?.metadata;
    const q = m && isRecord(m) ? m["quantum_front"] : null;
    if (q && isRecord(q)) return q;
  }
  return null;
}

function Card({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 hover:bg-zinc-900/40 transition-colors">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/60">{desc}</div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<AdminOrderRow[] | null>(null);
  const [ordersError, setOrdersError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setOrdersError("");
        const res = await fetch("/api/admin/orders?limit=25", { cache: "no-store" });
        const json: unknown = await res.json().catch(() => null);
        const data = isRecord(json) ? json : {};
        if (!res.ok || data.success !== true) {
          const msg = typeof data.error === "string" ? data.error : "failed";
          throw new Error(msg);
        }
        const payload = isRecord(data.data) ? data.data : {};
        const rows = Array.isArray(payload.orders) ? payload.orders : [];
        const parsed: AdminOrderRow[] = [];
        for (const r of rows) {
          if (!isRecord(r)) continue;
          const key = typeof r.key === "string" ? r.key : "";
          const order = isRecord(r.order) ? r.order : null;
          if (!order) continue;
          const id = typeof order.id === "string" ? order.id : "";
          const createdAt = typeof order.createdAt === "string" ? order.createdAt : "";
          if (!id || !createdAt) continue;
          parsed.push(r as AdminOrderRow);
        }
        if (!cancelled) setOrders(parsed);
      } catch (e: unknown) {
        if (!cancelled) {
          setOrders(null);
          setOrdersError(e instanceof Error ? e.message : "failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderedOrders = useMemo(() => orders || [], [orders]);

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="text-xl font-semibold">Master Control Center</div>
        <div className="mt-1 text-sm text-white/60">Manage generators, Printify text, advanced settings, and shipping.</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card href="/admin/ai-generators" title="AI Generators" desc="Enable/disable providers, set URLs and timeouts." />
        <Card href="/admin/printify-back-text" title="Printify Back Text" desc="Control back-of-shirt word collage text and styling." />
        <Card href="/admin/crypto" title="Advanced (disabled)" desc="Disabled for Stripe compliance unless explicitly enabled by server env." />
        <Card href="/admin/shipping" title="Shipping" desc="Configure shipping quote rules used at checkout." />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg font-semibold">Recent Orders</div>
          <div className="text-xs text-white/50">Quantum details show when Quantum Verified was selected.</div>
        </div>
        {ordersError ? (
          <div className="mt-3 text-sm text-red-300">Orders unavailable: {ordersError}</div>
        ) : orders === null ? (
          <div className="mt-3 text-sm text-white/60">Loading…</div>
        ) : renderedOrders.length === 0 ? (
          <div className="mt-3 text-sm text-white/60">No orders yet.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {renderedOrders.map((row) => {
              const o = row.order;
              const q = getQuantumFrontMeta(o.items);
              const qSeedHash = q && typeof q.qf_quantum_seed_hash === "string" ? q.qf_quantum_seed_hash : "";
              const qImgHash = q && typeof q.image_hash === "string" ? q.image_hash : "";
              const qJob = o.quantumProof?.jobId || "";
              const qBackend = o.quantumProof?.backend || "";
              const qRefunded = Boolean(o.quantumRefunded);
              const title = o.items?.[0]?.title || "Order";
              return (
                <div key={`${row.key}-${o.id}`} className="rounded-lg border border-zinc-800/70 bg-black/20 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-semibold">{title}</div>
                    <div className="text-xs text-white/60">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-white/80">
                    <div>
                      <span className="text-white/50">Stripe Session:</span> {o.id}
                    </div>
                    <div>
                      <span className="text-white/50">Printify Order:</span> {o.printifyOrderId || "—"}
                    </div>
                    <div>
                      <span className="text-white/50">Total:</span> {typeof o.total === "number" ? `$${o.total.toFixed(2)}` : "—"}
                    </div>
                    <div>
                      <span className="text-white/50">Quantum Verified:</span>{" "}
                      {o.quantumVerified ? (qRefunded ? "Yes (premium refunded)" : "Yes") : "No"}
                    </div>
                    {o.quantumVerified ? (
                      <div className="grid gap-1 rounded-md border border-zinc-800/60 bg-black/30 p-3">
                        <div>
                          <span className="text-white/50">IBM jobId:</span> {qJob || "—"}
                        </div>
                        <div>
                          <span className="text-white/50">IBM backend:</span> {qBackend || "—"}
                        </div>
                        <div>
                          <span className="text-white/50">qf_quantum_seed_hash:</span> {qSeedHash || "—"}
                        </div>
                        <div>
                          <span className="text-white/50">image_hash:</span> {qImgHash || "—"}
                        </div>
                      </div>
                    ) : null}
                    <div className="text-xs text-white/50">Key: {row.key}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
