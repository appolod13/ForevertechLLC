import { describe, it, expect, vi } from 'vitest';
import { fetchWithRetry } from '@/lib/integrations/http';

describe('fetchWithRetry', () => {
  it('returns json on 200', async () => {
    // @ts-expect-error Mocking global.fetch in test
    global.fetch = vi.fn(async () => ({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ ok: true }),
    }));
    const res = await fetchWithRetry('https://example.com', { method: 'GET' }, { retries: 1 });
    expect(res).toEqual({ ok: true });
  });

  it('retries on failure', async () => {
    const calls: number[] = [];
    // @ts-expect-error Mocking global.fetch to return 500
    global.fetch = vi.fn(async () => {
      calls.push(Date.now());
      return { ok: false, status: 500, text: async () => 'err', headers: new Map() };
    });
    await expect(fetchWithRetry('https://x.com', { method: 'GET' }, { retries: 2, baseDelayMs: 10 })).rejects.toBeTruthy();
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  it('aborts on timeout', async () => {
    // @ts-expect-error Mocking fetch to respect AbortController
    global.fetch = vi.fn(async (_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = (init as { signal?: AbortSignal })?.signal;
        if (signal) {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }
      });
    });
    await expect(fetchWithRetry('https://x.com', { method: 'GET' }, { retries: 0, timeoutMs: 50 })).rejects.toBeTruthy();
  });
});
