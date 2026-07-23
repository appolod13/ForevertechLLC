import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const resolvedParams = await params;
  const platform = resolvedParams.platform;
  const requestUrl = new URL(request.url);
  const userId = requestUrl.searchParams.get('userId');

  const buildPlatformUrl = (pathname: string) => {
    const url = new URL(pathname, request.url);
    if (userId) url.searchParams.set('userId', userId);
    return url;
  };

  if (platform === 'twitter') {
    const url = buildPlatformUrl('/api/auth/twitter/login');
    return NextResponse.redirect(url);
  }

  if (platform === 'instagram') {
    const url = buildPlatformUrl('/api/auth/instagram/login');
    return NextResponse.redirect(url);
  }

  if (platform === 'tiktok') {
    const url = buildPlatformUrl('/api/auth/tiktok/login');
    return NextResponse.redirect(url);
  }

  if (platform === 'youtube') {
    const url = buildPlatformUrl('/api/auth/youtube/login');
    return NextResponse.redirect(url);
  }

  if (platform === 'reddit') {
    const url = buildPlatformUrl('/api/auth/reddit/login');
    return NextResponse.redirect(url);
  }
  
  // NOTE: This is a placeholder Mock OAuth flow for testing the UI.
  // To implement real OAuth for Instagram/TikTok/YouTube/Telegram, 
  // you will redirect to their respective authorization URLs here.
  
  const cookieStore = await cookies();
  
  // Mocking a successful login by setting a fake token
  cookieStore.set(`${platform}_user_token`, `mock_token_${Date.now()}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  cookieStore.set(`${platform}_screen_name`, `MockUser_${platform}`, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  // Redirect back to studio
  const url = new URL('/studio', request.url);
  return NextResponse.redirect(url);
}
