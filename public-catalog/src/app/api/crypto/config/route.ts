import { NextResponse } from "next/server";
import { getCryptoConfig } from "@/lib/cryptoConfig";

export const runtime = "nodejs";

export async function GET() {
  const cfg = getCryptoConfig();
  return NextResponse.json({ success: true, data: cfg }, { status: 200 });
}
