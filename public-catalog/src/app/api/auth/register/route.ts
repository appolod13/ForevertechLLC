import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getString(v: unknown, maxLen = 300): string {
  const s = typeof v === "string" ? v : "";
  const t = s.trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function normalizeUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const nameRaw = u.user_metadata && typeof u.user_metadata.name === "string" ? u.user_metadata.name : "";
  return {
    id: u.id,
    email: u.email || "",
    name: String(nameRaw || "").trim() || (u.email ? u.email.split("@")[0] : "User"),
  };
}

function getSupabaseAnon() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

function getSupabaseService() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({} as unknown));
    const b = (body && typeof body === "object") ? (body as Record<string, unknown>) : {};

    const email = getString(b.email, 200).toLowerCase();
    const password = getString(b.password, 200);
    const name = getString(b.name, 120);

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "missing_email_or_password" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "password_too_short" }, { status: 400 });
    }

    const service = getSupabaseService();
    if (service) {
      const { data, error } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || undefined },
      });
      if (error || !data?.user) {
        return NextResponse.json({ success: false, error: error?.message || "register_failed" }, { status: 400 });
      }
      return NextResponse.json({ success: true, user: normalizeUser(data.user) }, { status: 200 });
    }

    const supabase = getSupabaseAnon();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "supabase_not_configured" }, { status: 500 });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || undefined } },
    });
    if (error || !data?.user) {
      return NextResponse.json({ success: false, error: error?.message || "register_failed" }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: normalizeUser(data.user) }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "internal_error" },
      { status: 500 },
    );
  }
}

