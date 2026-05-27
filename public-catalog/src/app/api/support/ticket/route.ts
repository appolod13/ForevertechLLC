import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown, maxLen: number) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isEmail(s: string) {
  if (!s) return false;
  if (s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

type Ticket = {
  id: string;
  createdAt: number;
  email: string;
  subject: string;
  message: string;
};

function getStore() {
  const g = globalThis as unknown as { __ftSupportTickets?: Ticket[] };
  if (!g.__ftSupportTickets) g.__ftSupportTickets = [];
  return g.__ftSupportTickets;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  if (!isRecord(body)) return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 });

  const email = getString(body.email, 254).toLowerCase();
  const subject = getString(body.subject, 96);
  const message = getString(body.message, 5000);

  if (!isEmail(email)) return NextResponse.json({ success: false, error: "invalid_email" }, { status: 400 });
  if (!subject) return NextResponse.json({ success: false, error: "missing_subject" }, { status: 400 });
  if (!message) return NextResponse.json({ success: false, error: "missing_message" }, { status: 400 });

  const webhook = (process.env.SUPPORT_TICKET_WEBHOOK_URL || "").trim();
  if (process.env.NODE_ENV === "production" && !webhook) {
    return NextResponse.json({ success: false, error: "support_not_configured" }, { status: 503 });
  }

  const ticket: Ticket = { id: randomUUID(), createdAt: Date.now(), email, subject, message };

  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticket }),
    }).catch(() => null);
    if (!res || !res.ok) {
      return NextResponse.json({ success: false, error: "ticket_delivery_failed" }, { status: 502 });
    }
  } else {
    const store = getStore();
    store.unshift(ticket);
    store.splice(50);
  }

  return NextResponse.json({ success: true, message: "Ticket submitted.", data: { ticketId: ticket.id } }, { status: 200 });
}

