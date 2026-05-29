import { NextResponse } from "next/server";
import { getCryptoConfig } from "@/lib/cryptoConfig";

export const runtime = "nodejs";

export async function GET() {
  const cfg = getCryptoConfig();
  const enabled = process.env.ENABLE_CRYPTO_PAYMENTS === "1" && cfg.payments?.enabled === true;
  if (!enabled) {
    return NextResponse.json({ success: false, error: "disabled" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: cfg }, { status: 200 });
}
