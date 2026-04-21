import { NextResponse } from 'next/server';

const carts: Record<string, any[]> = {};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { deviceId = 'anonymous' } = payload;
    
    carts[deviceId] = [];

    return NextResponse.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to clear cart' });
  }
}
