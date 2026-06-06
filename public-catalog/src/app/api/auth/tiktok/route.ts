import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json({ error: 'TikTok client key not configured' }, { status: 500 });
  }

  const redirectUri = new URL('/api/auth/tiktok/callback', request.url).toString();
  const csrfState = Math.random().toString(36).substring(2);

  const tiktokAuthUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  tiktokAuthUrl.searchParams.set('client_key', clientKey);
  tiktokAuthUrl.searchParams.set('scope', 'user.info.basic');
  tiktokAuthUrl.searchParams.set('response_type', 'code');
  tiktokAuthUrl.searchParams.set('redirect_uri', redirectUri);
  tiktokAuthUrl.searchParams.set('state', csrfState);

  const response = NextResponse.redirect(tiktokAuthUrl.toString());
  response.cookies.set('tiktok_csrf_state', csrfState, { path: '/', httpOnly: true });

  return response;
}
