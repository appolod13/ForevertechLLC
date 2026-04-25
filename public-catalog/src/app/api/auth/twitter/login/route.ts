import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;

  if (!appKey || !appSecret) {
    return NextResponse.json({ error: 'Twitter API credentials missing' }, { status: 500 });
  }

  const client = new TwitterApi({ appKey, appSecret });
  // Always use the explicitly configured callback URL to match the Twitter Developer Portal
  const callbackUrl = 'http://localhost:3001/api/auth/twitter/callback';

  try {
    const authLink = await client.generateAuthLink(callbackUrl, { linkMode: 'authorize' });
    
    const cookieStore = await cookies();
    cookieStore.set('twitter_oauth_token_secret', authLink.oauth_token_secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
      path: '/',
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
