import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown, maxLen: number) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizePhone(raw: string) {
  const s = raw.replace(/[^\d+]/g, "");
  if (!s) return "";
  if (s.startsWith("+")) return s.length > 16 ? s.slice(0, 16) : s;
  if (s.length >= 10 && s.length <= 15) return `+${s}`;
  return "";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  if (!isRecord(body)) return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 });

  const phoneNumberRaw = getString(body.phoneNumber, 40);
  const phoneNumber = normalizePhone(phoneNumberRaw);
  const reason = getString(body.reason, 24);

  if (!phoneNumber) return NextResponse.json({ success: false, error: "invalid_phone" }, { status: 400 });

  const enabled = (process.env.SUPPORT_CALL_ENABLED || "").trim() === "1";
  const webhook = (process.env.SUPPORT_CALL_WEBHOOK_URL || "").trim();
  if (process.env.NODE_ENV === "production" && (!enabled || !webhook)) {
    return NextResponse.json({ success: false, error: "call_not_configured" }, { status: 503 });
  }

  const callId = randomUUID();
  if (enabled && webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callId, phoneNumber, reason }),
    }).catch(() => null);
    if (!res || !res.ok) {
      return NextResponse.json({ success: false, error: "call_delivery_failed" }, { status: 502 });
    }
  }

  return NextResponse.json({ success: true, callId }, { status: 200 });
}

