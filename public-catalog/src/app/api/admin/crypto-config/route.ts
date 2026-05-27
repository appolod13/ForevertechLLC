import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getCryptoConfig, updateCryptoConfig, type CryptoConfigPatch } from "@/lib/cryptoConfig";

export const runtime = "nodejs";

function isSameOrigin(req: NextRequest): boolean {
  const origin = (req.headers.get("origin") || "").trim();
  const referer = (req.headers.get("referer") || "").trim();
  const candidate = origin || referer;
  if (!candidate) return false;
  try {
    const u = new URL(req.url);
    const o = new URL(candidate);
    if (u.origin === o.origin) return true;
    if (u.protocol !== o.protocol) return false;
    if (u.port !== o.port) return false;
    const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
    if (localHosts.has(u.hostname) && localHosts.has(o.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const allowDevBypass = process.env.NODE_ENV !== "production" && req.headers.get("x-dev-bypass") === "1" && isSameOrigin(req);
    const auth = allowDevBypass ? { ok: true as const } : requireAdmin(req);
    if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ success: true, data: { config: getCryptoConfig() } }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const allowDevBypass = process.env.NODE_ENV !== "production" && req.headers.get("x-dev-bypass") === "1" && isSameOrigin(req);
    const auth = allowDevBypass ? { ok: true as const } : requireAdmin(req);
    if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({} as unknown));
    const config = updateCryptoConfig(body as CryptoConfigPatch);
    return NextResponse.json({ success: true, data: { config } }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
