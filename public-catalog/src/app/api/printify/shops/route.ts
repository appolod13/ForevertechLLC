import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Missing PRINTIFY_API_TOKEN' },
      { status: 500 }
    );
  }

  const res = await fetch('https://api.printify.com/v1/shops.json', {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'public-catalog',
    },
  });

  const body = await res.text();
  const contentType = res.headers.get('content-type') || 'application/json';

  return new Response(body, {
    status: res.status,
    headers: { 'content-type': contentType },
  });
}

