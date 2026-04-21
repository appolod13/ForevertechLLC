import { NextResponse } from 'next/server';

const carts: Record<string, any[]> = {};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { itemId, deviceId = 'anonymous' } = payload;
    
    if (carts[deviceId]) {
      carts[deviceId] = carts[deviceId].filter(i => i.id !== itemId);
    }

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to remove item' });
  }
}
