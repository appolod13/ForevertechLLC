type Latest = { imageUrl: string; filename?: string; meta?: Record<string, unknown>; ts: number };

let latest: Latest | null = null;

export function setLatestImage(v: { imageUrl: string; filename?: string; meta?: Record<string, unknown> }) {
  const url = (v.imageUrl || "").trim();
  if (!url) return;
  latest = { imageUrl: url, filename: v.filename, meta: v.meta, ts: Date.now() };
}

export function getLatestImage(): Latest | null {
  return latest;
}

