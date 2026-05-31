import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { cookies } from 'next/headers';

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = (request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'http').trim();
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host).trim();
  return `${proto}://${host}`;
}

function sanitizeCallbackUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim().replace(/`/g, '').replace(/^["']+|["']+$/g, '').trim();
  if (!cleaned) return '';

  const fixedScheme = cleaned.replace(/^(https?)\/\//, '$1://');
  try {
    const u = new URL(fixedScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    if (process.env.NODE_ENV === 'production' && u.protocol !== 'https:') return '';
    return u.toString();
  } catch {
    return '';
  }
}

export async function GET(request: Request) {
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;

  if (!appKey || !appSecret) {
    return NextResponse.json({ error: 'Twitter API credentials missing' }, { status: 500 });
  }

  const client = new TwitterApi({ appKey, appSecret });
  const configured = sanitizeCallbackUrl(process.env.TWITTER_CALLBACK_URL);
  const callbackUrl = configured || `${requestOrigin(request)}/api/auth/twitter/callback`;

  try {
    const authLink = await client.generateAuthLink(callbackUrl, { linkMode: 'authorize' });
    
    const cookieStore = await cookies();
    cookieStore.set('twitter_oauth_token', authLink.oauth_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
      path: '/',
      sameSite: 'lax',
    });
    cookieStore.set('twitter_oauth_token_secret', authLink.oauth_token_secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.redirect(authLink.url);
  } catch (error: unknown) {
    console.error('Twitter login error:', error);
    const err = error as { code?: unknown; data?: unknown; message?: unknown };
    const details =
      typeof err?.message === 'string'
        ? err.message
        : typeof err?.code === 'number'
          ? `Request failed with code ${err.code}`
          : error instanceof Error
            ? error.message
            : String(error);
    return NextResponse.json({ 
      error: 'Failed to generate auth link', 
      details,
      callbackAttempted: callbackUrl,
      hint:
        typeof process.env.TWITTER_CALLBACK_URL === 'string' && process.env.TWITTER_CALLBACK_URL.includes('`')
          ? 'TWITTER_CALLBACK_URL contains backticks. Set it to https://www.pixelqrypt.com/api/auth/twitter/callback (no backticks, no quotes).'
          : 'Verify X app permissions (OAuth 1.0a enabled + Read/Write) and the callback URL is allowed in the X Developer Portal.',
    }, { status: 500 });
  }
}
