import { Buffer } from 'node:buffer';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getServiceSupabase } from '@/lib/supabase';

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = (request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'http').trim();
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host).trim();
  return `${proto}://${host}`;
}

function getCallbackUrl(request: Request) {
  return (process.env.REDDIT_CALLBACK_URL || '').trim() || `${requestOrigin(request)}/api/auth/reddit/callback`;
}

function getUserAgent() {
  return (process.env.REDDIT_USER_AGENT || '').trim() || 'PixelQrypt/1.0 (ForeverTech)';
}

async function exchangeCodeForToken(params: { code: string; callbackUrl: string }) {
  const clientId = (process.env.REDDIT_CLIENT_ID || '').trim();
  const clientSecret = (process.env.REDDIT_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) throw new Error('Reddit OAuth credentials missing');

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', params.code);
  body.set('redirect_uri', params.callbackUrl);

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': getUserAgent(),
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string }
    | null;

  if (!res.ok || !json?.access_token) {
    throw new Error((json?.error_description || json?.error || '').trim() || `reddit_http_${res.status}`);
  }

  return {
    accessToken: json.access_token,
    refreshToken: (json.refresh_token || '').trim(),
    expiresIn: typeof json.expires_in === 'number' ? json.expires_in : 3600,
    scope: (json.scope || '').trim(),
  };
}

async function fetchRedditIdentity(accessToken: string) {
  const res = await fetch('https://oauth.reddit.com/api/v1/me', {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'user-agent': getUserAgent(),
    },
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => null)) as { name?: string; id?: string } | null;
  if (!res.ok || !json?.name) {
    throw new Error(`reddit_identity_http_${res.status}`);
  }

  return {
    accountName: json.name.trim(),
    accountId: (json.id || '').trim(),
  };
}

async function persistConnectedAccount(params: {
  userId: string;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken: string;
  scope: string;
}) {
  if (!params.userId) return;
  const supabase = getServiceSupabase({ requireServiceRole: true });
  if (!supabase) return;

  await supabase.from('user_social_accounts').upsert(
    {
      user_id: params.userId,
      platform: 'reddit',
      account_id: params.accountId || params.accountName,
      account_name: params.accountName,
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
      scopes: params.scope ? params.scope.split(/\s+/).filter(Boolean) : [],
      metadata: { connected_via: 'oauth_callback' },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform' },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const redirectUrl = new URL('/studio', requestOrigin(request));
  const cookieStore = await cookies();
  const expectedState = cookieStore.get('reddit_oauth_state')?.value || '';
  const pendingUserId = cookieStore.get('reddit_oauth_user_id')?.value || '';

  cookieStore.delete('reddit_oauth_state');
  cookieStore.delete('reddit_oauth_user_id');

  if (error || !code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const token = await exchangeCodeForToken({ code, callbackUrl: getCallbackUrl(request) });
    const identity = await fetchRedditIdentity(token.accessToken);

    cookieStore.set('reddit_user_token', token.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: token.expiresIn,
      path: '/',
      sameSite: 'lax',
    });
    if (token.refreshToken) {
      cookieStore.set('reddit_user_refresh_token', token.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax',
      });
    }
    cookieStore.set('reddit_screen_name', identity.accountName || 'reddit', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
    });

    await persistConnectedAccount({
      userId: pendingUserId,
      accountId: identity.accountId,
      accountName: identity.accountName,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      scope: token.scope,
    });
  } catch (callbackError) {
    console.error('Reddit callback error:', callbackError);
  }

  return NextResponse.redirect(redirectUrl);
}
