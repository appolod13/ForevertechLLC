type UploadResult =
  | { status: "disabled" }
  | { status: "uploaded"; cid: string; ipfsUrl: string; gatewayUrl?: string }
  | { status: "failed"; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeAuth(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(bearer|basic)\s/i.test(trimmed)) return trimmed;
  return `Bearer ${trimmed}`;
}

function toAbsoluteUrl(imageUrl: string, internalBaseUrl?: string): string {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")) return imageUrl;
  const base = (internalBaseUrl || "").trim().replace(/\/$/, "");
  if (!base) throw new Error("relative_imageUrl_without_internal_base");
  return `${base}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

async function blobFromDataUrl(dataUrl: string): Promise<Blob> {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
  if (!match) throw new Error("invalid_data_url");
  const mime = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const dataPart = match[3] || "";
  const bytes = isBase64 ? Uint8Array.from(Buffer.from(dataPart, "base64")) : Uint8Array.from(Buffer.from(decodeURIComponent(dataPart), "utf-8"));
  return new Blob([bytes], { type: mime });
}

function parseIpfsAddResponse(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const j: unknown = JSON.parse(lines[i]);
      if (isRecord(j) && typeof j.Hash === "string" && j.Hash.trim()) return j.Hash.trim();
    } catch {
    }
  }
  throw new Error("ipfs_invalid_add_response");
}

export async function uploadToIpfs(params: { imageUrl: string; filename?: string; internalBaseUrl?: string }): Promise<UploadResult> {
  const apiBase = (process.env.IPFS_API_URL || "").trim();
  if (!apiBase) return { status: "disabled" };

  const auth = normalizeAuth(process.env.IPFS_API_AUTH || "");
  const gatewayBase = (process.env.IPFS_GATEWAY_BASE || "").trim().replace(/\/$/, "");
  const url = `${apiBase.replace(/\/$/, "")}/api/v0/add?pin=true`;

  const resolved = toAbsoluteUrl(params.imageUrl, params.internalBaseUrl);
  const filename = (params.filename || "asset.png").trim() || "asset.png";

  try {
    let blob: Blob;
    if (resolved.startsWith("data:")) {
      blob = await blobFromDataUrl(resolved);
    } else {
      const res = await fetch(resolved, { cache: "no-store" });
      if (!res.ok) return { status: "failed", error: `image_fetch_http_${res.status}` };
      blob = await res.blob();
    }

    const form = new FormData();
    form.append("file", blob, filename);
    const headers: Record<string, string> = {};
    if (auth) headers.authorization = auth;

    const res = await fetch(url, { method: "POST", headers, body: form, cache: "no-store" });
    const text = await res.text();
    if (!res.ok) return { status: "failed", error: `ipfs_http_${res.status}` };

    const cid = parseIpfsAddResponse(text);
    const ipfsUrl = `ipfs://${cid}`;
    const gatewayUrl = gatewayBase ? `${gatewayBase}/${cid}` : undefined;
    return { status: "uploaded", cid, ipfsUrl, gatewayUrl };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "ipfs_upload_failed" };
  }
}

