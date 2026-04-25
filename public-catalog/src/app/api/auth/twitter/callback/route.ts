import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const oauthToken = url.searchParams.get('oauth_token');
  const oauthVerifier = url.searchParams.get('oauth_verifier');
  const denied = url.searchParams.get('denied');

  const redirectUrl = new URL('/studio', request.url);

  if (denied || !oauthToken || !oauthVerifier) {
    return NextResponse.redirect(redirectUrl);
  }

  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;

  const cookieStore = await cookies();
  const oauthTokenSecret = cookieStore.get('twitter_oauth_token_secret')?.value;

  if (!appKey || !appSecret || !oauthTokenSecret) {
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
    });

    cookieStore.set('twitter_user_secret', accessSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    
    cookieStore.set('twitter_screen_name', screenName, {
      httpOnly: false, // Let the frontend read it if needed
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    // Clean up temporary secret
    cookieStore.delete('twitter_oauth_token_secret');

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Twitter callback error:', error);
    return NextResponse.redirect(redirectUrl);
  }
}
