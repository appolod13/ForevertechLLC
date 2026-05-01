"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ShippingOptionRule = {
  id: string;
  label: string;
  enabled: boolean;
  countries: "US_ONLY" | "NON_US_ONLY" | "ALL";
  baseUsd: number;
  perItemUsd: number;
  eta: string;
};

type ShippingConfig = {
  version: string;
  options: ShippingOptionRule[];
};

type ApiOk<T> = { success: true; data: T };
type ApiFail = { success: false; error: string; details?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function errorFrom(json: unknown, status: number) {
  return isRecord(json) && typeof json.error === "string" ? json.error : `HTTP_${status}`;
}

export default function AdminShippingPage() {
  const router = useRouter();
  const redirectToLogin = useMemo(() => `/admin/login?redirect=${encodeURIComponent("/admin/shipping")}`, []);

  const [cfg, setCfg] = useState<ShippingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/admin/me", { cache: "no-store" }).catch(() => null);
      if (!me || !me.ok) {
        router.replace(redirectToLogin);
        return;
      }

      const res = await fetch("/api/admin/shipping", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiOk<{ config: ShippingConfig }> | ApiFail | null;
      if (!res.ok || !json || !json.success) {
        setMsg(errorFrom(json, res.status));
        return;
      }
      setCfg(json.data.config);
    })();
  }, [router, redirectToLogin]);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const json = (await res.json().catch(() => null)) as ApiOk<{ config: ShippingConfig }> | ApiFail | null;
      if (!res.ok || !json || !json.success) {
        setMsg(errorFrom(json, res.status));
        return;
      }
      setCfg(json.data.config);
      setMsg("Saved");
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) return <div className="text-sm text-white/60">Loading...</div>;

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Shipping</div>
            <div className="mt-1 text-sm text-white/60">Controls shipping options shown at checkout.</div>
          </div>
          <button onClick={() => router.push("/admin")} className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">
            Back
          </button>
        </div>
        {msg ? <div className="mt-3 text-sm text-white/70">{msg}</div> : null}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="grid gap-3">
          {cfg.options.map((o, idx) => (
            <div key={o.id || idx} className="rounded-lg border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="font-semibold">{o.label}</div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-white/70">Enabled</span>
                  <input
                    type="checkbox"
                    checked={o.enabled}
                    onChange={(e) => {
                      const next = cfg.options.slice();
                      next[idx] = { ...o, enabled: e.target.checked };
                      setCfg({ ...cfg, options: next });
                    }}
                    className="h-4 w-4 accent-white"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <div className="text-sm text-white/70">Countries</div>
                  <select
                    className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                    value={o.countries}
                    onChange={(e) => {
                      const next = cfg.options.slice();
                      next[idx] = { ...o, countries: e.target.value as ShippingOptionRule["countries"] };
                      setCfg({ ...cfg, options: next });
                    }}
                  >
                    <option value="US_ONLY">US only</option>
                    <option value="NON_US_ONLY">Non-US only</option>
                    <option value="ALL">All</option>
                  </select>
                </div>

                <div className="grid gap-1">
                  <div className="text-sm text-white/70">ETA</div>
                  <input
                    className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                    value={o.eta}
                    onChange={(e) => {
                      const next = cfg.options.slice();
                      next[idx] = { ...o, eta: e.target.value };
                      setCfg({ ...cfg, options: next });
                    }}
                  />
                </div>

                <div className="grid gap-1">
                  <div className="text-sm text-white/70">Base (USD)</div>
                  <input
                    className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                    inputMode="decimal"
                    value={String(o.baseUsd)}
                    onChange={(e) => {
                      const next = cfg.options.slice();
                      next[idx] = { ...o, baseUsd: Number(e.target.value) };
                      setCfg({ ...cfg, options: next });
                    }}
                  />
                </div>

                <div className="grid gap-1">
                  <div className="text-sm text-white/70">Per Item (USD)</div>
                  <input
                    className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                    inputMode="decimal"
                    value={String(o.perItemUsd)}
                    onChange={(e) => {
                      const next = cfg.options.slice();
                      next[idx] = { ...o, perItemUsd: Number(e.target.value) };
                      setCfg({ ...cfg, options: next });
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button className="rounded-md bg-white text-black px-3 py-2 text-sm font-medium disabled:opacity-60" disabled={saving} onClick={save}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="mt-3 text-xs text-white/50">Config version: {cfg.version}</div>
      </div>
    </div>
  );
}
