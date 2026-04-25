import { NextResponse } from 'next/server';
import { clearCart } from '@/lib/cartStore';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { deviceId = 'anonymous' } = payload as { deviceId?: string };
    
    clearCart(deviceId);

    return NextResponse.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to clear cart' });
  }
}
