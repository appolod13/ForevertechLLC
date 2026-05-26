import { NextResponse } from 'next/server';
import { getCart } from '@/lib/cartStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'anonymous';
    
    return NextResponse.json({
      success: true,
      items: getCart(deviceId)
    });
  } catch (error: unknown) {
    console.error('Cart fetch error:', error);
    return NextResponse.json({ success: false, items: [] });
  }
}
