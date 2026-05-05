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

type CryptoPaymentToken = {
  id: string;
  enabled: boolean;
  chainId: number;
  symbol: string;
  name: string;
  kind: "native" | "erc20" | "btc";
  address: string;
  decimals: number;
  coingeckoId: string;
};

type CryptoPaymentsConfig = {
  enabled: boolean;
  confirmations: number;
  receiveAddresses: Array<{ chainId: number; address: string }>;
  tokens: CryptoPaymentToken[];
};

type CryptoConfig = {
  version: string;
  primaryChainId: number;
  chains: ChainConfig[];
  payments: CryptoPaymentsConfig;
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

function isEvmAddress(v: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(String(v || "").trim());
}

function isBitcoinAddress(v: string): boolean {
  const s = String(v || "").trim();
  if (!s) return false;
  if (/^bc1[ac-hj-np-z02-9]{11,71}$/i.test(s)) return true;
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(s)) return true;
  return false;
}

function receiveAddressError(chainId: number, address: string): string | null {
  const cid = Number.isFinite(chainId) ? Math.trunc(chainId) : NaN;
  const addr = String(address || "").trim();
  if (!addr) return "Missing address";
  if (cid === 100000) {
    return isBitcoinAddress(addr) ? null : "Invalid BTC address (use bc1… / 1… / 3…)";
  }
  return isEvmAddress(addr) ? null : "Invalid EVM address (must be 0x… 40 hex chars)";
}

export default function AdminCryptoPage() {
  const router = useRouter();
  const redirectToLogin = useMemo(() => `/admin/login?redirect=${encodeURIComponent("/admin/crypto")}`, []);

  const [cfg, setCfg] = useState<CryptoConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/crypto-config", {
        cache: "no-store",
        headers: process.env.NODE_ENV !== "production" ? { "x-dev-bypass": "1" } : undefined,
        credentials: "include",
      }).catch(() => null);
      if (!res) {
        setMsg("Failed to load crypto config (server unreachable).");
        return;
      }
      if (res.status === 401) {
        router.replace(redirectToLogin);
        return;
      }
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
    const ras = cfg.payments?.receiveAddresses || [];
    for (const ra of ras) {
      const cid = Number(ra.chainId);
      const err = receiveAddressError(Number.isFinite(cid) ? Math.trunc(cid) : NaN, String(ra.address || ""));
      if (err) {
        setMsg(`Receive address error (chainId ${String(ra.chainId)}): ${err}`);
        return;
      }
    }
    setSaving(true);
    setMsg(null);
    try {
      const controller = new AbortController();
      const timeoutMs = process.env.NODE_ENV !== "production" ? 60000 : 15000;
      const t = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch("/api/admin/crypto-config", {
        method: "POST",
        headers: { "content-type": "application/json", ...(process.env.NODE_ENV !== "production" ? { "x-dev-bypass": "1" } : {}) },
        body: JSON.stringify(cfg),
        signal: controller.signal,
        credentials: "include",
      });
      clearTimeout(t);
      const json = (await res.json().catch(() => null)) as ApiOk<{ config: CryptoConfig }> | ApiFail | null;
      if (!res.ok || !json || !json.success) {
        setMsg(errorFrom(json, res.status));
        return;
      }
      setCfg(json.data.config);
      setMsg("Saved");
    } catch (e: unknown) {
      const name = e instanceof Error ? e.name : "";
      if (name === "AbortError") {
        setMsg("Save timed out. Try again (dev can be slow on first save).");
      } else {
        setMsg(e instanceof Error ? e.message : "Save failed");
      }
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

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Crypto Payments</div>
              <div className="mt-1 text-sm text-white/60">Configure “Buy with crypto” tokens and receiving addresses.</div>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/70">Enabled</span>
              <input
                type="checkbox"
                checked={Boolean(cfg.payments?.enabled)}
                onChange={(e) => setCfg({ ...cfg, payments: { ...cfg.payments, enabled: e.target.checked } })}
                className="h-4 w-4 accent-white"
              />
            </label>

            <div className="grid gap-1">
              <div className="text-sm text-white/70">Confirmations Required</div>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                inputMode="numeric"
                value={String(cfg.payments?.confirmations ?? 1)}
                onChange={(e) => setCfg({ ...cfg, payments: { ...cfg.payments, confirmations: Number(e.target.value) } })}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white/90">Receiving Addresses</div>
                <button
                  className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  onClick={() =>
                    setCfg({
                      ...cfg,
                      payments: {
                        ...cfg.payments,
                        receiveAddresses: [...(cfg.payments?.receiveAddresses || []), { chainId: 56, address: "" }],
                      },
                    })
                  }
                >
                  Add address
                </button>
              </div>
              <div className="grid gap-3">
                {(cfg.payments?.receiveAddresses || []).map((ra, idx) => (
                  <div key={`${ra.chainId}_${idx}`} className="rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white/90">Address #{idx + 1}</div>
                      <button
                        className="text-sm text-red-300"
                        onClick={() =>
                          setCfg({
                            ...cfg,
                            payments: { ...cfg.payments, receiveAddresses: (cfg.payments?.receiveAddresses || []).filter((_, i) => i !== idx) },
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <div className="text-sm text-white/70">Chain ID</div>
                        <input
                          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                          inputMode="numeric"
                          value={String(ra.chainId)}
                          onChange={(e) => {
                            const next = (cfg.payments?.receiveAddresses || []).slice();
                            next[idx] = { ...ra, chainId: Number(e.target.value) };
                            setCfg({ ...cfg, payments: { ...cfg.payments, receiveAddresses: next } });
                          }}
                        />
                      </div>
                      <div className="grid gap-1 sm:col-span-1">
                        <div className="text-sm text-white/70">Address</div>
                        <input
                          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none font-mono text-sm"
                          value={ra.address}
                          onChange={(e) => {
                            const next = (cfg.payments?.receiveAddresses || []).slice();
                            next[idx] = { ...ra, address: e.target.value };
                            setCfg({ ...cfg, payments: { ...cfg.payments, receiveAddresses: next } });
                          }}
                          placeholder="0x..."
                        />
                        {receiveAddressError(Number(ra.chainId), String(ra.address || "")) ? (
                          <div className="text-xs text-red-300">{receiveAddressError(Number(ra.chainId), String(ra.address || ""))}</div>
                        ) : (
                          <div className="text-xs text-white/40">
                            {Number(ra.chainId) === 100000 ? "Bitcoin (BTC) address" : "EVM address (0x…)"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white/90">Tokens</div>
                <button
                  className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  onClick={() =>
                    setCfg({
                      ...cfg,
                      payments: {
                        ...cfg.payments,
                        tokens: [
                          ...(cfg.payments?.tokens || []),
                          { id: newId(), enabled: false, chainId: 56, symbol: "TOKEN", name: "Token", kind: "erc20", address: "", decimals: 18, coingeckoId: "token" },
                        ],
                      },
                    })
                  }
                >
                  Add token
                </button>
              </div>

              <div className="grid gap-3">
                {(cfg.payments?.tokens || []).map((t, idx) => (
                  <div key={t.id || idx} className="rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-white/90">{t.symbol || "TOKEN"} (chainId {t.chainId})</div>
                      <button
                        className="text-sm text-red-300"
                        onClick={() =>
                          setCfg({
                            ...cfg,
                            payments: { ...cfg.payments, tokens: (cfg.payments?.tokens || []).filter((x) => x.id !== t.id) },
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <div className="text-sm text-white/70">Name</div>
                        <input
                          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                          value={t.name}
                          onChange={(e) => {
                            const next = (cfg.payments?.tokens || []).slice();
                            next[idx] = { ...t, name: e.target.value };
                            setCfg({ ...cfg, payments: { ...cfg.payments, tokens: next } });
                          }}
                        />
                      </div>
                      <div className="grid gap-1">
                        <div className="text-sm text-white/70">Symbol</div>
                        <input
                          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none font-mono"
                          value={t.symbol}
                          onChange={(e) => {
                            const next = (cfg.payments?.tokens || []).slice();
                            next[idx] = { ...t, symbol: e.target.value };
                            setCfg({ ...cfg, payments: { ...cfg.payments, tokens: next } });
                          }}
                        />
                      </div>
                      <div className="grid gap-1">
                        <div className="text-sm text-white/70">Chain ID</div>
                        <input
                          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                          inputMode="numeric"
                          value={String(t.chainId)}
                          onChange={(e) => {
                            const next = (cfg.payments?.tokens || []).slice();
                            next[idx] = { ...t, chainId: Number(e.target.value) };
                            setCfg({ ...cfg, payments: { ...cfg.payments, tokens: next } });
                          }}
                        />
                      </div>
                      <div className="grid gap-1">
                        <div className="text-sm text-white/70">Kind</div>
                        <select
                          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                          value={t.kind}
                          onChange={(e) => {
                            const next = (cfg.payments?.tokens || []).slice();
                            const v = e.target.value;
                            next[idx] = { ...t, kind: (v === "btc" ? "btc" : v === "native" ? "native" : "erc20") as "native" | "erc20" | "btc" };
                            setCfg({ ...cfg, payments: { ...cfg.payments, tokens: next } });
                          }}
                        >
                          <option value="native">native</option>
                          <option value="erc20">erc20</option>
                          <option value="btc">btc</option>
                        </select>
                      </div>
                      {t.kind === "erc20" ? (
                        <div className="grid gap-1 sm:col-span-2">
                          <div className="text-sm text-white/70">Token Contract Address (erc20 only)</div>
                          <input
                            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none font-mono text-sm"
                            value={t.address}
                            onChange={(e) => {
                              const next = (cfg.payments?.tokens || []).slice();
                              next[idx] = { ...t, address: e.target.value };
                              setCfg({ ...cfg, payments: { ...cfg.payments, tokens: next } });
                            }}
                            placeholder="0x..."
                          />
                        </div>
                      ) : null}
                      <div className="grid gap-1">
                        <div className="text-sm text-white/70">Decimals</div>
                        <input
                          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                          inputMode="numeric"
                          value={String(t.decimals)}
                          onChange={(e) => {
                            const next = (cfg.payments?.tokens || []).slice();
                            next[idx] = { ...t, decimals: Number(e.target.value) };
                            setCfg({ ...cfg, payments: { ...cfg.payments, tokens: next } });
                          }}
                        />
                      </div>
                      <div className="grid gap-1">
                        <div className="text-sm text-white/70">CoinGecko ID</div>
                        <input
                          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none font-mono text-sm"
                          value={t.coingeckoId}
                          onChange={(e) => {
                            const next = (cfg.payments?.tokens || []).slice();
                            next[idx] = { ...t, coingeckoId: e.target.value };
                            setCfg({ ...cfg, payments: { ...cfg.payments, tokens: next } });
                          }}
                        />
                      </div>
                      <label className="flex items-center justify-between gap-3 text-sm sm:col-span-2">
                        <span className="text-white/70">Enabled</span>
                        <input
                          type="checkbox"
                          checked={t.enabled}
                          onChange={(e) => {
                            const next = (cfg.payments?.tokens || []).slice();
                            next[idx] = { ...t, enabled: e.target.checked };
                            setCfg({ ...cfg, payments: { ...cfg.payments, tokens: next } });
                          }}
                          className="h-4 w-4 accent-white"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              <button className="rounded-md bg-white text-black px-3 py-2 text-sm font-medium disabled:opacity-60" disabled={saving} onClick={save}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
