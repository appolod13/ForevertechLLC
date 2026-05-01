import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const session = getAdminSession(req);
  if (!session) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, data: { authenticated: true, email: session.email } }, { status: 200 });
}
