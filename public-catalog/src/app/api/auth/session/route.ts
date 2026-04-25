import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  
  const platforms = ['twitter', 'telegram', 'instagram', 'tiktok', 'youtube'];
  const session: Record<string, { authenticated: boolean; screenName?: string }> = {};

  for (const p of platforms) {
    const token = cookieStore.get(`${p}_user_token`)?.value;
    const screenName = cookieStore.get(`${p}_screen_name`)?.value;
    
    if (token) {
      session[p] = { authenticated: true, screenName: screenName || p };
    } else {
      session[p] = { authenticated: false };
    }
  }
  
  return NextResponse.json(session);
}
