import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { cookies } from 'next/headers';

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = (request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'http').trim();
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host).trim();
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;

  if (!appKey || !appSecret) {
    return NextResponse.json({ error: 'Twitter API credentials missing' }, { status: 500 });
  }

  const client = new TwitterApi({ appKey, appSecret });
  const configured = (process.env.TWITTER_CALLBACK_URL || '').trim();
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'Failed to generate auth link', 
      details: errorMessage,
      callbackAttempted: callbackUrl
    }, { status: 500 });
  }
}
