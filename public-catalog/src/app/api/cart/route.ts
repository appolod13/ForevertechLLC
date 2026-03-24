import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { getCart } from "./_state";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("deviceId") || "";
  const userId = url.searchParams.get("userId");

  if (!deviceId.trim()) return fail("validation_error", 400, ["deviceId is required"]);
  const cart = getCart({ userId: userId?.trim() || null, deviceId: deviceId.trim() });
  return ok({ items: cart.items, updatedAt: cart.updatedAt });
}

