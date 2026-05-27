"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AiGeneratorsConfig = {
  fusion: { enabled: boolean; internalBaseUrl: string; publicBaseUrl: string };
  quantum: { enabled: boolean; internalBaseUrl: string; publicBaseUrl: string };
  timeouts: { stdMs: number; quantumMs: number };
};

type ApiOk<T> = { success: true; data: T };
type ApiFail = { success: false; error: string; details?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function errorFrom(json: unknown, status: number) {
  return isRecord(json) && typeof json.error === "string" ? json.error : `HTTP_${status}`;
}

export default function AdminAiGeneratorsPage() {
  const router = useRouter();
  const redirectToLogin = useMemo(() => `/admin/login?redirect=${encodeURIComponent("/admin/ai-generators")}`, []);

  const [cfg, setCfg] = useState<AiGeneratorsConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [test, setTest] = useState<{ loading: boolean; imageUrl?: string; meta?: unknown; error?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/admin/me", { cache: "no-store" }).catch(() => null);
      if (!me || !me.ok) {
        router.replace(redirectToLogin);
        return;
      }
      const res = await fetch("/api/admin/ai-generators", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiOk<{ config: AiGeneratorsConfig }> | ApiFail | null;
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
      const res = await fetch("/api/admin/ai-generators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const json = (await res.json().catch(() => null)) as ApiOk<{ config: AiGeneratorsConfig }> | ApiFail | null;
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

  async function runTest(mode: "fusion" | "quantum") {
    setTest({ loading: true });
    setMsg(null);
    try {
      const body =
        mode === "quantum"
          ? { prompt: "Admin test image", width: 512, height: 512, quantum_mode: true, ipfs_upload: false }
          : { prompt: "Admin test image", width: 512, height: 512, quantum_mode: false, ipfs_upload: false };

      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json().catch(() => null);
      const success = isRecord(json) && json.success === true;
      if (!res.ok || !success) {
        setTest({ loading: false, error: errorFrom(json, res.status) });
        return;
      }
      const data = isRecord(json) && isRecord(json.data) ? (json.data as Record<string, unknown>) : {};
      const imageUrl = typeof data.image_url === "string" ? data.image_url : "";
      const meta = isRecord(data.meta) ? data.meta : data.meta;
      setTest({ loading: false, imageUrl, meta });
    } catch (e: unknown) {
      setTest({ loading: false, error: e instanceof Error ? e.message : "test_failed" });
    }
  }

  if (!cfg) {
    return <div className="text-sm text-white/60">Loading...</div>;
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">AI Generators</div>
            <div className="mt-1 text-sm text-white/60">Configure Fusion/Quantum endpoints and timeouts.</div>
          </div>
          <button onClick={() => router.push("/admin")} className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">
            Back
          </button>
        </div>
        {msg ? <div className="mt-3 text-sm text-white/70">{msg}</div> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="font-semibold">Fusion</div>
          <div className="mt-3 grid gap-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/70">Enabled</span>
              <input
                type="checkbox"
                checked={cfg.fusion.enabled}
                onChange={(e) => setCfg({ ...cfg, fusion: { ...cfg.fusion, enabled: e.target.checked } })}
                className="h-4 w-4 accent-white"
              />
            </label>
            <div className="grid gap-1">
              <div className="text-sm text-white/70">Internal Base URL</div>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                value={cfg.fusion.internalBaseUrl}
                onChange={(e) => setCfg({ ...cfg, fusion: { ...cfg.fusion, internalBaseUrl: e.target.value } })}
              />
            </div>
            <div className="grid gap-1">
              <div className="text-sm text-white/70">Public Base URL</div>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                value={cfg.fusion.publicBaseUrl}
                onChange={(e) => setCfg({ ...cfg, fusion: { ...cfg.fusion, publicBaseUrl: e.target.value } })}
              />
            </div>
            <button
              className="w-fit rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm disabled:opacity-60"
              disabled={test?.loading}
              onClick={() => runTest("fusion")}
            >
              {test?.loading ? "Testing..." : "Test Fusion"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="font-semibold">Quantum</div>
          <div className="mt-3 grid gap-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/70">Enabled</span>
              <input
                type="checkbox"
                checked={cfg.quantum.enabled}
                onChange={(e) => setCfg({ ...cfg, quantum: { ...cfg.quantum, enabled: e.target.checked } })}
                className="h-4 w-4 accent-white"
              />
            </label>
            <div className="grid gap-1">
              <div className="text-sm text-white/70">Internal Base URL</div>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                value={cfg.quantum.internalBaseUrl}
                onChange={(e) => setCfg({ ...cfg, quantum: { ...cfg.quantum, internalBaseUrl: e.target.value } })}
              />
            </div>
            <div className="grid gap-1">
              <div className="text-sm text-white/70">Public Base URL</div>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                value={cfg.quantum.publicBaseUrl}
                onChange={(e) => setCfg({ ...cfg, quantum: { ...cfg.quantum, publicBaseUrl: e.target.value } })}
              />
            </div>
            <button
              className="w-fit rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm disabled:opacity-60"
              disabled={test?.loading}
              onClick={() => runTest("quantum")}
            >
              {test?.loading ? "Testing..." : "Test Quantum"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 lg:col-span-2">
          <div className="font-semibold">Timeouts</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <div className="text-sm text-white/70">Standard Timeout (ms)</div>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                inputMode="numeric"
                value={String(cfg.timeouts.stdMs)}
                onChange={(e) => setCfg({ ...cfg, timeouts: { ...cfg.timeouts, stdMs: Number(e.target.value) } })}
              />
            </div>
            <div className="grid gap-1">
              <div className="text-sm text-white/70">Quantum Timeout (ms)</div>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                inputMode="numeric"
                value={String(cfg.timeouts.quantumMs)}
                onChange={(e) => setCfg({ ...cfg, timeouts: { ...cfg.timeouts, quantumMs: Number(e.target.value) } })}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-md bg-white text-black px-3 py-2 text-sm font-medium disabled:opacity-60" disabled={saving} onClick={save}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {test?.error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200 lg:col-span-2">{test.error}</div>
        ) : null}

        {test?.imageUrl ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 lg:col-span-2">
            <div className="text-sm text-white/70">Last Test Result</div>
            <div className="mt-3 rounded-md border border-white/10 bg-black/30 p-3">
              <img src={test.imageUrl} alt="Test result" className="max-w-full rounded-md border border-white/10" />
            </div>
            <pre className="mt-3 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs text-white/70">
              {JSON.stringify(test.meta || {}, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
