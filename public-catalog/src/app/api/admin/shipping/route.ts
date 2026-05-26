import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getShippingConfig, updateShippingConfig, type ShippingConfigPatch } from "@/lib/shippingConfig";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, data: { config: getShippingConfig() } }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as unknown));
  const config = updateShippingConfig(body as ShippingConfigPatch);
  return NextResponse.json({ success: true, data: { config } }, { status: 200 });
}
