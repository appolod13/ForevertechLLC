import { NextResponse } from 'next/server';
import { getCart, setCart } from '@/lib/cartStore';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { itemId, deviceId = 'anonymous' } = payload as { itemId: string, deviceId?: string };
    
    let cart = getCart(deviceId);
    cart = cart.filter(i => i.id !== itemId);
    setCart(deviceId, cart);

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to remove item' });
  }
}
