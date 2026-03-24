import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { setCart } from "../_state";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => ({}));
  const b = isRecord(body) ? body : {};
  const deviceId = typeof b.deviceId === "string" ? b.deviceId.trim() : "";
  const userId = typeof b.userId === "string" ? b.userId.trim() : "";

  if (!deviceId) return fail("validation_error", 400, ["deviceId is required"]);

  const next = setCart({ userId: userId || null, deviceId, items: [] });
  return ok({ success: true, items: next.items, updatedAt: next.updatedAt });
}

