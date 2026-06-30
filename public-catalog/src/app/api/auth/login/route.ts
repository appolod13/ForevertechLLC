import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

function getString(v: unknown, maxLen = 300): string {
  const s = typeof v === "string" ? v : "";
  const t = s.trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function normalizeUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const nameRaw = u.user_metadata && typeof u.user_metadata.name === "string" ? u.user_metadata.name : "";
  const premiumCreator = Boolean(u.user_metadata && (u.user_metadata as Record<string, unknown>).premiumCreator === true);
  const stripeConnectAccountId =
    u.user_metadata && typeof (u.user_metadata as Record<string, unknown>).stripeConnectAccountId === "string"
      ? String((u.user_metadata as Record<string, unknown>).stripeConnectAccountId)
      : "";
  return {
    id: u.id,
    email: u.email || "",
    name: String(nameRaw || "").trim() || (u.email ? u.email.split("@")[0] : "User"),
    premiumCreator,
    stripeConnectAccountId: stripeConnectAccountId || undefined,
  };
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "supabase_not_configured" }, { status: 500 });
    }

    const body: unknown = await request.json().catch(() => ({} as unknown));
    const b = (body && typeof body === "object") ? (body as Record<string, unknown>) : {};
    const email = getString(b.email, 200).toLowerCase();
    const password = getString(b.password, 200);

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "missing_email_or_password" }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.user) {
      return NextResponse.json({ success: false, error: error?.message || "login_failed" }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: normalizeUser(data.user) }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "internal_error" },
      { status: 500 },
    );
  }
}
