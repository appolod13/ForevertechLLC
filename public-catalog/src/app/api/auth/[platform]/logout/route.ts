import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const resolvedParams = await params;
  const platform = resolvedParams.platform;
  const cookieStore = await cookies();
  
  cookieStore.delete(`${platform}_user_token`);
  cookieStore.delete(`${platform}_user_secret`);
  cookieStore.delete(`${platform}_user_refresh_token`);
  cookieStore.delete(`${platform}_screen_name`);
  cookieStore.delete(`${platform}_user_id`);
  cookieStore.delete(`${platform}_oauth_token_secret`);
  cookieStore.delete(`${platform}_oauth_state`);
  
  return NextResponse.json({ success: true });
}
