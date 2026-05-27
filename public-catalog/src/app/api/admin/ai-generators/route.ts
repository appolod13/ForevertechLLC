import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getAiGeneratorsConfig, updateAiGeneratorsConfig, type AiGeneratorsConfigPatch } from "@/lib/aiGeneratorsConfig";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, data: { config: getAiGeneratorsConfig() } }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as unknown));
  const updated = updateAiGeneratorsConfig(body as AiGeneratorsConfigPatch);
  return NextResponse.json({ success: true, data: { config: updated } }, { status: 200 });
}
