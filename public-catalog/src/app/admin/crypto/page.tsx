"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

type ApiOk<T> = { success: true; data: T };
type ApiFail = { success: false; error: string; details?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function errorFrom(json: unknown, status: number) {
  return isRecord(json) && typeof json.error === "string" ? json.error : `HTTP_${status}`;
}

function newId() {
  return (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`).slice(0, 48);
}

export default function AdminCryptoPage() {
  const router = useRouter();
  const redirectToLogin = useMemo(() => `/admin/login?redirect=${encodeURIComponent("/admin/crypto")}`, []);

  const [cfg, setCfg] = useState<CryptoConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/admin/me", { cache: "no-store" }).catch(() => null);
      if (!me || !me.ok) {
        router.replace(redirectToLogin);
        return;
      }

      const res = await fetch("/api/admin/crypto-config", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiOk<{ config: CryptoConfig }> | ApiFail | null;
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
      const res = await fetch("/api/admin/crypto-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const json = (await res.json().catch(() => null)) as ApiOk<{ config: CryptoConfig }> | ApiFail | null;
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
            <div className="text-xl font-semibold">Crypto Setup</div>
            <div className="mt-1 text-sm text-white/60">Configure multi-chain editions and gasless claim settings.</div>
          </div>
          <button onClick={() => router.push("/admin")} className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">
            Back
          </button>
        </div>
        {msg ? <div className="mt-3 text-sm text-white/70">{msg}</div> : null}
      </div>

      <div className="grid gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="font-semibold">Primary Chain</div>
          <div className="mt-2 grid gap-1">
            <div className="text-sm text-white/70">Primary Chain ID</div>
            <input
              className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
              inputMode="numeric"
              value={String(cfg.primaryChainId)}
              onChange={(e) => setCfg({ ...cfg, primaryChainId: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Chains</div>
            <button
              className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
              onClick={() =>
                setCfg({
                  ...cfg,
                  chains: [
                    ...cfg.chains,
                    { id: newId(), name: "New Chain", chainId: 0, enabled: false, gaslessClaim: false, contractAddress: "", mintFunction: "safeMint" },
                  ],
                })
              }
            >
              Add chain
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {cfg.chains.map((c, idx) => (
              <div key={c.id || idx} className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{c.name || "Chain"}</div>
                  <button className="text-sm text-red-300" onClick={() => setCfg({ ...cfg, chains: cfg.chains.filter((x) => x.id !== c.id) })}>
                    Remove
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <div className="text-sm text-white/70">Name</div>
                    <input
                      className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                      value={c.name}
                      onChange={(e) => {
                        const next = cfg.chains.slice();
                        next[idx] = { ...c, name: e.target.value };
                        setCfg({ ...cfg, chains: next });
                      }}
                    />
                  </div>

                  <div className="grid gap-1">
                    <div className="text-sm text-white/70">Chain ID</div>
                    <input
                      className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                      inputMode="numeric"
                      value={String(c.chainId)}
                      onChange={(e) => {
                        const next = cfg.chains.slice();
                        next[idx] = { ...c, chainId: Number(e.target.value) };
                        setCfg({ ...cfg, chains: next });
                      }}
                    />
                  </div>

                  <div className="grid gap-1 sm:col-span-2">
                    <div className="text-sm text-white/70">Contract Address</div>
                    <input
                      className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none font-mono text-sm"
                      value={c.contractAddress}
                      onChange={(e) => {
                        const next = cfg.chains.slice();
                        next[idx] = { ...c, contractAddress: e.target.value };
                        setCfg({ ...cfg, chains: next });
                      }}
                      placeholder="0x..."
                    />
                  </div>

                  <div className="grid gap-1">
                    <div className="text-sm text-white/70">Mint Function</div>
                    <input
                      className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                      value={c.mintFunction}
                      onChange={(e) => {
                        const next = cfg.chains.slice();
                        next[idx] = { ...c, mintFunction: e.target.value };
                        setCfg({ ...cfg, chains: next });
                      }}
                      placeholder="safeMint"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/70">Enabled</span>
                      <input
                        type="checkbox"
                        checked={c.enabled}
                        onChange={(e) => {
                          const next = cfg.chains.slice();
                          next[idx] = { ...c, enabled: e.target.checked };
                          setCfg({ ...cfg, chains: next });
                        }}
                        className="h-4 w-4 accent-white"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/70">Gasless Claim</span>
                      <input
                        type="checkbox"
                        checked={c.gaslessClaim}
                        onChange={(e) => {
                          const next = cfg.chains.slice();
                          next[idx] = { ...c, gaslessClaim: e.target.checked };
                          setCfg({ ...cfg, chains: next });
                        }}
                        className="h-4 w-4 accent-white"
                      />
                    </label>
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
    </div>
  );
}
