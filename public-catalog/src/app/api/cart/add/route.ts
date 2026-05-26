import { NextResponse } from 'next/server';
import { getCart, setCart, CartItem } from '@/lib/cartStore';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { item, deviceId = 'anonymous' } = payload as { item: CartItem, deviceId?: string };
    
    const cart = getCart(deviceId);
    
    // Check if item already exists
    const existingIndex = cart.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += (item.quantity || 1);
    } else {
      cart.push(item);
    }
    
    setCart(deviceId, cart);

    return NextResponse.json({
      success: true,
      message: 'Item added to cart'
    });
  } catch (error: unknown) {
    console.error('Cart add error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
