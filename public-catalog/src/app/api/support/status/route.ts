import { NextResponse } from "next/server";

type SupportStatus = {
  agentsAvailable: number;
  queueLength: number;
  estimatedWait: number;
};

function toInt(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.trunc(n));
}

export async function GET() {
  const status: SupportStatus = {
    agentsAvailable: toInt(process.env.SUPPORT_AGENTS_AVAILABLE, 1),
    queueLength: toInt(process.env.SUPPORT_QUEUE_LENGTH, 0),
    estimatedWait: toInt(process.env.SUPPORT_EST_WAIT_MIN, 2),
  };
  return NextResponse.json(status, { status: 200 });
}

