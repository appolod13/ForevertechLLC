import crypto from 'crypto';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = (request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'http').trim();
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host).trim();
  return `${proto}://${host}`;
}

function getCallbackUrl(request: Request) {
  const configured = (process.env.REDDIT_CALLBACK_URL || '').trim();
  if (configured) return configured;
  return `${requestOrigin(request)}/api/auth/reddit/callback`;
}

export async function GET(request: Request) {
  const clientId = (process.env.REDDIT_CLIENT_ID || '').trim();
  if (!clientId) {
    return NextResponse.json({ error: 'Reddit OAuth credentials missing' }, { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const userId = requestUrl.searchParams.get('userId')?.trim() || '';
  const state = crypto.randomUUID();
  const callbackUrl = getCallbackUrl(request);

  const authUrl = new URL('https://www.reddit.com/api/v1/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('duration', 'permanent');
  authUrl.searchParams.set('scope', 'identity submit read');

  const cookieStore = await cookies();
  cookieStore.set('reddit_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60,
    path: '/',
    sameSite: 'lax',
  });

  if (userId) {
    cookieStore.set('reddit_oauth_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60,
      path: '/',
      sameSite: 'lax',
    });
  }

  return NextResponse.redirect(authUrl);
}
