import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const reqUrl = new URL(request.url);
    const url = reqUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const raw = String(url || '').trim();
    const resolvedUrl = (() => {
      if (!raw) return '';
      if (raw.startsWith('ipfs://')) {
        const cid = raw.slice('ipfs://'.length).replace(/^ipfs\//, '');
        return cid ? `https://ipfs.io/ipfs/${cid}` : '';
      }
      if (raw.startsWith('/')) {
        return new URL(raw, reqUrl.origin).toString();
      }
      if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
      return '';
    })();

    if (!resolvedUrl) {
      return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 });
    }

    const response = await fetch(resolvedUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(blob, { headers });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
