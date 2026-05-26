import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";

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
  const allowDevBypass = process.env.NODE_ENV !== "production" && req.headers.get("x-dev-bypass") === "1" && isSameOrigin(req);
  const session = allowDevBypass ? { email: (process.env.ADMIN_EMAIL || "dev@local").trim() || "dev@local" } : getAdminSession(req);
  if (!session) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, data: { authenticated: true, email: session.email } }, { status: 200 });
}
