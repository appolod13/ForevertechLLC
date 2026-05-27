"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function AdminLoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirectTo = useMemo(() => sp.get("redirect") || "/admin", [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json: unknown = await res.json().catch(() => null);
      const success = isRecord(json) && json.success === true;
      if (!res.ok || !success) {
        const err = isRecord(json) && typeof json.error === "string" ? json.error : `HTTP_${res.status}`;
        setError(String(err));
        return;
      }

      router.replace(redirectTo);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black text-white">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-black/20 p-6">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-white/70">Email</label>
            <input
              className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-white/70">Password</label>
            <input
              className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error ? <div className="text-sm text-red-400">{error}</div> : null}
          <button className="w-full rounded-md bg-white text-black px-3 py-2 font-medium disabled:opacity-60" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center px-4 bg-black text-white">Loading…</div>}>
      <AdminLoginInner />
    </Suspense>
  );
}
