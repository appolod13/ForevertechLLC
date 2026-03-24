import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { getCart, setCart, type CartItem } from "../_state";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => ({}));
  const b = isRecord(body) ? body : {};
  const deviceId = typeof b.deviceId === "string" ? b.deviceId.trim() : "";
  const userId = typeof b.userId === "string" ? b.userId.trim() : "";
  const item = isRecord(b.item) ? (b.item as Record<string, unknown>) : null;

  if (!deviceId) return fail("validation_error", 400, ["deviceId is required"]);
  if (!item) return fail("validation_error", 400, ["item is required"]);
  if (typeof item.id !== "string" || !item.id.trim()) return fail("validation_error", 400, ["item.id is required"]);
  if (typeof item.title !== "string") return fail("validation_error", 400, ["item.title is required"]);
  if (typeof item.price !== "number") return fail("validation_error", 400, ["item.price must be number"]);

  const normalized: CartItem = {
    id: item.id.trim(),
    title: String(item.title),
    price: Number(item.price),
    quantity: typeof item.quantity === "number" ? Math.max(1, Math.floor(item.quantity)) : 1,
    imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : undefined,
    description: typeof item.description === "string" ? item.description : undefined,
    currency: item.currency === "fc" ? "fc" : "usd",
    metadata: isRecord(item.metadata) ? (item.metadata as Record<string, unknown>) : undefined,
  };

  const cart = getCart({ userId: userId || null, deviceId });
  const existing = cart.items.find((i) => i.id === normalized.id);
  let items: CartItem[];
  if (existing) {
    items = cart.items.map((i) => (i.id === normalized.id ? { ...i, quantity: (i.quantity || 1) + normalized.quantity } : i));
  } else {
    items = [...cart.items, normalized];
  }
  const next = setCart({ userId: userId || null, deviceId, items });
  return ok({ success: true, items: next.items, updatedAt: next.updatedAt });
}

