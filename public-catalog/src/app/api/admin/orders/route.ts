import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getAllOrders, type OrderRecord } from "@/lib/cartStore";

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

function redactOrder(order: OrderRecord): OrderRecord {
  const qp = order.quantumProof;
  if (!qp || typeof qp.seed !== "string" || !qp.seed.trim()) return order;
  return {
    ...order,
    quantumProof: {
      ...qp,
      seed: "",
    },
  };
}

export async function GET(req: NextRequest) {
  const allowDevBypass = process.env.NODE_ENV !== "production" && req.headers.get("x-dev-bypass") === "1" && isSameOrigin(req);
  const session = allowDevBypass ? { ok: true as const, session: { email: (process.env.ADMIN_EMAIL || "dev@local").trim() || "dev@local" } } : requireAdmin(req);
  if (!session.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  const limitRaw = (req.nextUrl.searchParams.get("limit") || "").trim();
  const limit = Math.max(1, Math.min(200, Math.trunc(Number(limitRaw || "50")) || 50));
  const all = getAllOrders().slice(0, limit).map(({ key, order }) => ({ key, order: redactOrder(order) }));

  return NextResponse.json({ success: true, data: { orders: all } }, { status: 200 });
}
