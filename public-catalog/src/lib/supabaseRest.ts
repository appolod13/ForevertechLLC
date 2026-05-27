type SupabaseEnv = {
  url: string;
  serviceKey: string;
};

function getSupabaseEnv(): SupabaseEnv | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim();
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

function buildRestUrl(params: { baseUrl: string; table: string; query?: Record<string, string> }) {
  const u = new URL(`/rest/v1/${params.table}`, params.baseUrl);
  const q = params.query || {};
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  return u.toString();
}

async function supabaseRestFetch(params: {
  table: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string>;
  body?: unknown;
  accept?: string;
  prefer?: string;
}) {
  const env = getSupabaseEnv();
  if (!env) {
    return { ok: false as const, status: 500, error: "supabase_not_configured", data: null };
  }

  const url = buildRestUrl({ baseUrl: env.url, table: params.table, query: params.query });
  const headers: Record<string, string> = {
    apikey: env.serviceKey,
    Authorization: `Bearer ${env.serviceKey}`,
  };
  if (params.accept) headers.Accept = params.accept;
  if (params.prefer) headers.Prefer = params.prefer;
  if (params.body !== undefined) headers["content-type"] = "application/json";

  const res = await fetch(url, {
    method: params.method,
    headers,
    body: params.body !== undefined ? JSON.stringify(params.body) : undefined,
    cache: "no-store",
  }).catch(() => null);

  if (!res) return { ok: false as const, status: 500, error: "fetch_failed", data: null };
  const text = await res.text().catch(() => "");
  const json = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const message =
      typeof (json as any)?.message === "string"
        ? String((json as any).message)
        : typeof (json as any)?.error === "string"
          ? String((json as any).error)
          : `HTTP_${res.status}`;
    return { ok: false as const, status: res.status, error: message, data: json };
  }
  return { ok: true as const, status: res.status, error: null, data: json };
}

export async function supabaseSelectSingle<T>(params: { table: string; select: string; filters: Record<string, string> }) {
  const query: Record<string, string> = { select: params.select };
  for (const [col, expr] of Object.entries(params.filters)) query[col] = expr;
  return supabaseRestFetch({
    table: params.table,
    method: "GET",
    query,
    accept: "application/vnd.pgrst.object+json",
  }) as Promise<{ ok: true; status: number; error: null; data: T } | { ok: false; status: number; error: string; data: unknown }>;
}

export async function supabaseInsertSingle<T>(params: { table: string; row: Record<string, unknown>; select?: string }) {
  const query: Record<string, string> = {};
  if (params.select) query.select = params.select;
  return supabaseRestFetch({
    table: params.table,
    method: "POST",
    query,
    body: params.row,
    accept: "application/vnd.pgrst.object+json",
    prefer: "return=representation",
  }) as Promise<{ ok: true; status: number; error: null; data: T } | { ok: false; status: number; error: string; data: unknown }>;
}

