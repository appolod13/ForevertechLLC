import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const resolvedParams = await params;
  const platform = resolvedParams.platform;

  if (platform === 'twitter') {
    const url = new URL('/api/auth/twitter/login', request.url);
    return NextResponse.redirect(url);
  }

  if (platform === 'instagram') {
    const url = new URL('/api/auth/instagram/login', request.url);
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
