import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getPrintifyBackTextConfig, resetPrintifyBackTextConfig, updatePrintifyBackTextConfig, type PrintifyBackTextConfigPatch } from "@/lib/printifyBackText";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, data: { config: getPrintifyBackTextConfig() } }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as unknown));
  const b = body as { reset?: unknown };

  const config = b && b.reset === true ? resetPrintifyBackTextConfig() : updatePrintifyBackTextConfig(body as PrintifyBackTextConfigPatch);
  return NextResponse.json({ success: true, data: { config } }, { status: 200 });
}
