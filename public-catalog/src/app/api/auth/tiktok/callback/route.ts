import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const csrfState = cookieStore.get('tiktok_csrf_state')?.value;

  if (!state || state !== csrfState) {
    return NextResponse.json({ error: 'Invalid CSRF state' }, { status: 400 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    return NextResponse.json({ error: 'TikTok client credentials not configured' }, { status: 500 });
  }

  const redirectUri = new URL('/api/auth/tiktok/callback', request.url).toString();

  const tokenUrl = new URL('https://open.tiktokapis.com/v2/oauth/token/');
  const tokenParams = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code: code || '',
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  try {
    const tokenRes = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || 'Failed to fetch access token');
    }

    const accessToken = tokenData.access_token;

    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userData = await userRes.json();

    if (!userRes.ok) {
      throw new Error(userData.error.message || 'Failed to fetch user info');
    }

    const user = {
      id: userData.data.user.open_id,
      name: userData.data.user.display_name,
      // TikTok doesn't provide an email, so we'll have to handle this. 
      // For now, we can use a placeholder or decide how to manage users without emails.
      email: `${userData.data.user.open_id}@tiktok.com`, // Placeholder
    };

    // Here you would typically create a session for the user.
    // For now, we'll store the user in a cookie and redirect.
    const response = NextResponse.redirect(new URL('/profile', request.url));
    response.cookies.set('user', JSON.stringify(user), { path: '/' });

    return response;

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
