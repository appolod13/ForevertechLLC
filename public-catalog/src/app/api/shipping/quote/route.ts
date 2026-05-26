import { NextResponse } from "next/server";
import { quoteShipping } from "@/lib/shippingConfig";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = typeof n === "number" ? n : typeof n === "string" ? Number(n) : NaN;
  if (!Number.isFinite(v)) return fallback;
  const i = Math.trunc(v);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => ({} as unknown));
    const b = isRecord(body) ? body : {};
    const country = typeof b.country === "string" ? b.country : "US";
    const itemCount = clampInt(b.itemCount, 1, 1000, 1);
    const options = quoteShipping({ country, itemCount });
    return NextResponse.json({ success: true, data: { options } }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
