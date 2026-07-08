import { NextRequest, NextResponse } from 'next/server';

import { getAiGeneratorsConfig } from '@/lib/aiGeneratorsConfig';

function normalizePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return null;
  if (!trimmed.startsWith('/uploads/')) return null;
  return trimmed;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pathParam = url.searchParams.get('path');
  if (!pathParam) {
    return NextResponse.json({ success: false, error: 'path is required' }, { status: 400 });
  }

  const decoded = (() => {
    try {
      return decodeURIComponent(pathParam);
    } catch {
      return pathParam;
    }
  })();

  const path = normalizePath(decoded);
  if (!path) {
    return NextResponse.json({ success: false, error: 'invalid path' }, { status: 400 });
  }

  const cfg = getAiGeneratorsConfig();
  const base = cfg.fusion?.internalBaseUrl?.trim().replace(/\/$/, '');
  if (!base) {
    return NextResponse.json({ success: false, error: 'fusion service not configured' }, { status: 500 });
  }

  const targetUrl = `${base}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const upstream = await fetch(targetUrl, { cache: 'no-store', signal: controller.signal });
    if (!upstream.ok) {
      return NextResponse.json({ success: false, error: 'upstream fetch failed' }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'proxy failed' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

