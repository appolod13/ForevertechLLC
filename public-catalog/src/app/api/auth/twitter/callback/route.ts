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
  const url = new URL(request.url);
  const oauthToken = url.searchParams.get('oauth_token');
  const oauthVerifier = url.searchParams.get('oauth_verifier');
  const denied = url.searchParams.get('denied');

  const redirectUrl = new URL('/studio', requestOrigin(request));

  if (denied || !oauthToken || !oauthVerifier) {
    return NextResponse.redirect(redirectUrl);
  }

  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;

  const cookieStore = await cookies();
  const oauthTokenCookie = cookieStore.get('twitter_oauth_token')?.value;
  const oauthTokenSecret = cookieStore.get('twitter_oauth_token_secret')?.value;

  if (!appKey || !appSecret || !oauthTokenSecret || !oauthTokenCookie || oauthTokenCookie !== oauthToken) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const client = new TwitterApi({
      appKey,
      appSecret,
      accessToken: oauthToken,
      accessSecret: oauthTokenSecret,
    });

    const { client: loggedClient, accessToken, accessSecret, screenName } = await client.login(oauthVerifier);

    cookieStore.set('twitter_user_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
    });

    cookieStore.set('twitter_user_secret', accessSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
    });
    
    cookieStore.set('twitter_screen_name', screenName, {
      httpOnly: false, // Let the frontend read it if needed
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
    });

    // Clean up temporary secret
    cookieStore.delete('twitter_oauth_token');
    cookieStore.delete('twitter_oauth_token_secret');

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Twitter callback error:', error);
    return NextResponse.redirect(redirectUrl);
  }
}
