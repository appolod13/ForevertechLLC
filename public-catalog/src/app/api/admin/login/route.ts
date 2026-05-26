import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, adminCookieOptions, createAdminSessionToken, validateAdminCredentials } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as unknown));
  const b = body as { email?: unknown; password?: unknown };

  const email = typeof b.email === "string" ? b.email : "";
  const password = typeof b.password === "string" ? b.password : "";

  if (!validateAdminCredentials(email, password)) {
    return NextResponse.json({ success: false, error: "invalid_credentials" }, { status: 401 });
  }

  const token = createAdminSessionToken(email);
  const res = NextResponse.json({ success: true, data: { authenticated: true, email } }, { status: 200 });
  res.cookies.set(adminCookieName(), token, adminCookieOptions());
  return res;
}
