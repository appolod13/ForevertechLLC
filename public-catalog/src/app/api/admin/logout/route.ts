import { NextResponse } from "next/server";
import { adminCookieName } from "@/lib/adminAuth";

export async function POST() {
  const res = NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
  res.cookies.set(adminCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
