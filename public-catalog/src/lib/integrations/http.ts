type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

export interface FetchOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(delay: number) {
  const factor = 0.5 + Math.random();
  return Math.min(delay * factor, delay * 1.5);
}

export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  retry: RetryOptions = {}
) {
  const method = options.method || 'GET';
  const headers = options.headers || {};
  let body: undefined | string | FormData | URLSearchParams | Blob | ArrayBuffer;
  if (options.body !== undefined) {
    if (headers['content-type']?.includes('application/json')) {
      body = JSON.stringify(options.body as unknown);
    } else if (typeof options.body === 'string') {
      body = options.body;
    } else if (options.body instanceof FormData || options.body instanceof URLSearchParams) {
      body = options.body;
    } else if (options.body instanceof Blob || options.body instanceof ArrayBuffer) {
      body = options.body;
    } else {
      body = undefined;
    }
  }

  const retries = retry.retries ?? 3;
  const baseDelay = retry.baseDelayMs ?? 250;
  const maxDelay = retry.maxDelayMs ?? 4000;
  const timeoutMs = retry.timeoutMs ?? 8000;

  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retries) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      } as RequestInit);
      clearTimeout(t);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`status=${res.status} body=${text}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) return await res.json();
      return await res.text();
    } catch (e) {
      clearTimeout(t);
      lastError = e;
      attempt++;
      if (attempt > retries) break;
      const delay = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
      await sleep(jitter(delay));
    }
  }
  throw lastError;
}
