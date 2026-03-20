import { NextRequest } from 'next/server';
import { buildQuery } from '@/lib/search/buildQuery';
import { addLog, getLogs } from '@/lib/logging';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function GET() {
  return Response.json({ success: true, logs: getLogs() });
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();
    addLog({ stage: 'validate_input', input: { kind: 'search', body } });

    const query = String(body.query || '').trim();
    const exact = Boolean(body.exact ?? false);
    const siteFilters = Array.isArray(body.siteFilters) ? body.siteFilters : [];
    const filetypes = Array.isArray(body.filetypes) ? body.filetypes : [];
    const limit = Math.min(Math.max(Number(body.limit || 5), 1), 10);

    if (!query) {
      addLog({ stage: 'failed', error: { message: 'search-validation-error', context: { reason: 'empty-query' } } });
      return Response.json({ success: false, error: 'search-validation-error' }, { status: 400 });
    }

    const built = buildQuery({ query, exact, siteFilters, filetypes });
    addLog({ stage: 'processing', input: { built, limit } });

    const proxy = process.env.NEXT_PUBLIC_SEARCH_PROXY_URL;
    let results: Array<Record<string, unknown>> = [];
    let providerStatus: string | undefined = undefined;
    if (proxy) {
      try {
        const url = `${proxy}?q=${encodeURIComponent(built)}&num=${limit}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`provider-response-${res.status}`);
        const data: unknown = await res.json();
        if (isRecord(data)) {
          const candidate = Array.isArray(data.results) ? data.results : (Array.isArray(data.items) ? data.items : []);
          results = candidate.filter(isRecord);
        }
        providerStatus = 'ok';
      } catch (e) {
        providerStatus = 'error';
        addLog({ stage: 'failed', error: { message: 'search-provider-error', stack: (e as Error).stack, context: { built, limit } } });
      }
    } else {
      providerStatus = 'missing';
    }

    const duration = Date.now() - t0;
    addLog({ stage: 'validate_output', output: { providerStatus, count: results.length }, durationMs: duration });
    addLog({ stage: 'completed', durationMs: duration });
    return Response.json({ success: true, query: built, results, providerStatus });
  } catch (e) {
    const err = e as Error;
    addLog({ stage: 'failed', error: { message: err.message || 'search-error', stack: err.stack } });
    return Response.json({ success: false, error: 'search-error' }, { status: 400 });
  }
}
