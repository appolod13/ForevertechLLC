"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "bg-white text-black" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const redirectTo = useMemo(() => `/admin/login?redirect=${encodeURIComponent("/admin")}`, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/me", { cache: "no-store" }).catch(() => null);
      const json = res ? await res.json().catch(() => null) : null;
      if (!res || !res.ok || !json?.success) {
        router.replace(redirectTo);
        return;
      }
      setEmail(String(json.data?.email || ""));
    })();
  }, [router, redirectTo]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-lg font-semibold">Admin Control Center</div>
            {email ? <div className="text-xs text-white/50">{email}</div> : null}
          </div>
          <button onClick={logout} className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">
            Logout
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="grid gap-1">
            <NavLink href="/admin" label="Dashboard" />
            <NavLink href="/admin/ai-generators" label="AI Generators" />
            <NavLink href="/admin/printify-back-text" label="Printify Back Text" />
            <NavLink href="/admin/crypto" label="Crypto Setup" />
            <NavLink href="/admin/shipping" label="Shipping" />
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
