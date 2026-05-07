"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PrintifyBackTextConfig } from "@/lib/printifyBackText";

type ApiOk<T> = { success: true; data: T };
type ApiFail = { success: false; error: string; details?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function errorFrom(json: unknown, status: number) {
  return isRecord(json) && typeof json.error === "string" ? json.error : `HTTP_${status}`;
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function AdminPrintifyBackTextPage() {
  const router = useRouter();
  const redirectToLogin = useMemo(() => `/admin/login?redirect=${encodeURIComponent("/admin/printify-back-text")}`, []);

  const [cfg, setCfg] = useState<PrintifyBackTextConfig | null>(null);
  const [previewText, setPreviewText] = useState("CUSTOM FUTURE TECH");
  const [backStyle, setBackStyle] = useState<"words" | "abstract">("words");
  const [previewSvg, setPreviewSvg] = useState("");
  const [previewSvgMsg, setPreviewSvgMsg] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sampleUrl, setSampleUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/admin/me", { cache: "no-store" }).catch(() => null);
      if (!me || !me.ok) {
        router.replace(redirectToLogin);
        return;
      }

      const res = await fetch("/api/admin/printify-back-text", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiOk<{ config: PrintifyBackTextConfig }> | ApiFail | null;
      if (!res.ok || !json || !json.success) {
        setMsg(errorFrom(json, res.status));
        return;
      }
      setCfg(json.data.config);
    })();
  }, [router, redirectToLogin]);

  useEffect(() => {
    if (!cfg) return;
    if (backStyle !== "words") {
      setPreviewSvg("");
      setPreviewSvgMsg(null);
      return;
    }

    let cancelled = false;
    setPreviewSvgMsg("Rendering preview...");

    (async () => {
      const res = await fetch("/api/admin/printify-back-text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          previewSvg: true,
          cfg,
          text: previewText,
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiOk<{ svg: string }> | ApiFail | null;
      if (cancelled) return;
      if (!res.ok || !json || !json.success) {
        setPreviewSvg("");
        setPreviewSvgMsg(errorFrom(json, res.status));
        return;
      }
      setPreviewSvg(json.data.svg || "");
      setPreviewSvgMsg(null);
    })().catch((e: unknown) => {
      if (cancelled) return;
      const msg = e instanceof Error ? e.message : String(e || "preview_error");
      setPreviewSvg("");
      setPreviewSvgMsg(msg);
    });

    return () => {
      cancelled = true;
    };
  }, [cfg, previewText, backStyle]);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/printify-back-text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const json = (await res.json().catch(() => null)) as ApiOk<{ config: PrintifyBackTextConfig }> | ApiFail | null;
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

  async function reset() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/printify-back-text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const json = (await res.json().catch(() => null)) as ApiOk<{ config: PrintifyBackTextConfig }> | ApiFail | null;
      if (!res.ok || !json || !json.success) {
        setMsg(errorFrom(json, res.status));
        return;
      }
      setCfg(json.data.config);
      setMsg("Reset to defaults");
    } finally {
      setSaving(false);
    }
  }

  async function uploadSample() {
    if (!cfg) return;
    setUploading(true);
    setUploadMsg(null);
    setSampleUrl(null);
    try {
      const res = await fetch("/api/admin/printify-back-text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          uploadSample: true,
          text: previewText,
          backStyle,
          origin: typeof window !== "undefined" ? window.location.origin : "http://localhost:3001",
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiOk<{ previewUrl: string }> | ApiFail | null;
      if (!res.ok || !json || !json.success) {
        setUploadMsg(errorFrom(json, res.status));
        return;
      }
      setSampleUrl(json.data.previewUrl);
      setUploadMsg("Uploaded sample to Printify");
    } finally {
      setUploading(false);
    }
  }

  if (!cfg) return <div className="text-sm text-white/60">Loading...</div>;

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Printify Back Text</div>
            <div className="mt-1 text-sm text-white/60">Controls the back-of-shirt word collage used during Printify order creation.</div>
          </div>
          <button onClick={() => router.push("/admin")} className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">
            Back
          </button>
        </div>
        {msg ? <div className="mt-3 text-sm text-white/70">{msg}</div> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="font-semibold">Text</div>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-1">
              <div className="text-sm text-white/70">Mode</div>
              <select
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                value={cfg.textMode}
                onChange={(e) => setCfg({ ...cfg, textMode: e.target.value as "prompt" | "custom" })}
              >
                <option value="prompt">From prompt</option>
                <option value="custom">Custom text</option>
              </select>
            </div>

            <div className="grid gap-1">
              <div className="text-sm text-white/70">Custom Text</div>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                value={cfg.customText}
                onChange={(e) => setCfg({ ...cfg, customText: e.target.value })}
                placeholder="CUSTOM FUTURE TECH"
              />
            </div>

            <div className="grid gap-1">
              <div className="text-sm text-white/70">Preview Text (used when mode=From prompt)</div>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-1">
                <div className="text-sm text-white/70">Max Words</div>
                <input
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                  inputMode="numeric"
                  value={String(cfg.render.maxWords)}
                  onChange={(e) => setCfg({ ...cfg, render: { ...cfg.render, maxWords: Number(e.target.value) } })}
                />
              </div>
              <div className="grid gap-1">
                <div className="text-sm text-white/70">Max Chars</div>
                <input
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                  inputMode="numeric"
                  value={String(cfg.render.maxChars)}
                  onChange={(e) => setCfg({ ...cfg, render: { ...cfg.render, maxChars: Number(e.target.value) } })}
                />
              </div>
              <div className="grid gap-1">
                <div className="text-sm text-white/70">Max Word Len</div>
                <input
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                  inputMode="numeric"
                  value={String(cfg.render.maxWordLength)}
                  onChange={(e) => setCfg({ ...cfg, render: { ...cfg.render, maxWordLength: Number(e.target.value) } })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="font-semibold">Style</div>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-1">
                <div className="text-sm text-white/70">Background</div>
                <input
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                  value={cfg.render.backgroundColor}
                  onChange={(e) => setCfg({ ...cfg, render: { ...cfg.render, backgroundColor: e.target.value } })}
                />
              </div>
              <div className="grid gap-1">
                <div className="text-sm text-white/70">Text Color</div>
                <input
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                  value={cfg.render.textColor}
                  onChange={(e) => setCfg({ ...cfg, render: { ...cfg.render, textColor: e.target.value } })}
                />
              </div>
              <div className="grid gap-1">
                <div className="text-sm text-white/70">Stroke Color</div>
                <input
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                  value={cfg.render.strokeColor}
                  onChange={(e) => setCfg({ ...cfg, render: { ...cfg.render, strokeColor: e.target.value } })}
                />
              </div>
            </div>

            <div className="grid gap-1">
              <div className="text-sm text-white/70">Font Family</div>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                value={cfg.render.fontFamily}
                onChange={(e) => setCfg({ ...cfg, render: { ...cfg.render, fontFamily: e.target.value } })}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1">
                <div className="text-sm text-white/70">Angle Min</div>
                <input
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                  inputMode="numeric"
                  value={String(cfg.render.angleMin)}
                  onChange={(e) => setCfg({ ...cfg, render: { ...cfg.render, angleMin: Number(e.target.value) } })}
                />
              </div>
              <div className="grid gap-1">
                <div className="text-sm text-white/70">Angle Max</div>
                <input
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
                  inputMode="numeric"
                  value={String(cfg.render.angleMax)}
                  onChange={(e) => setCfg({ ...cfg, render: { ...cfg.render, angleMax: Number(e.target.value) } })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button className="rounded-md bg-white text-black px-3 py-2 text-sm font-medium disabled:opacity-60" disabled={saving} onClick={save}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm disabled:opacity-60"
                disabled={saving}
                onClick={reset}
              >
                Reset
              </button>
            </div>
            <div className="text-xs text-white/50">Config version: {cfg.version}</div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="font-semibold">Preview</div>
              <select
                className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none"
                value={backStyle}
                onChange={(e) => setBackStyle(e.target.value as "words" | "abstract")}
              >
                <option value="words">Words</option>
                <option value="abstract">Abstract</option>
              </select>
            </div>
            <button
              onClick={uploadSample}
              disabled={uploading}
              className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload QR Stamp Sample to Printify"}
            </button>
          </div>
          {uploadMsg ? <div className="mt-2 text-sm text-white/70">{uploadMsg}</div> : null}
          {sampleUrl ? (
            <div className="mt-2 text-sm">
              <a href={sampleUrl} target="_blank" rel="noreferrer" className="text-blue-300 underline">
                Open Printify preview_url
              </a>
            </div>
          ) : null}
          <div className="mt-3 rounded-md border border-white/10 bg-black/30 p-3 overflow-auto">
            {backStyle === "words" ? (
              previewSvg ? (
                <img src={svgDataUrl(previewSvg)} alt="Back preview" className="max-w-full rounded" />
              ) : (
                <div className="text-sm text-white/60">{previewSvgMsg || "No preview"}</div>
              )
            ) : sampleUrl ? (
              <img src={sampleUrl} alt="Back preview" className="max-w-full rounded" />
            ) : (
              <div className="text-sm text-white/60">Upload a sample to see the abstract back preview.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
