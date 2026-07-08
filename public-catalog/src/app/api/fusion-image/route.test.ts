import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from './route';

describe('fusion-image proxy route', () => {
  it('returns 400 when path is missing', async () => {
    const req = new NextRequest('http://localhost/api/fusion-image');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('proxies uploads from the fusion internal base url', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async () => {
      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const req = new NextRequest('http://localhost/api/fusion-image?path=%2Fuploads%2Ftest.png');
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/png');
      expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/uploads\/test\.png$/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

