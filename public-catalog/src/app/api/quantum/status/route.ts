import { NextResponse } from "next/server";
import { getQuantumStatus } from "@/lib/quantumVerified";

export async function GET() {
  const status = getQuantumStatus();
  return NextResponse.json({ success: true, data: status }, { status: 200 });
}

