import { NextResponse } from 'next/server';

// Temporary mock in-memory store for carts
// In a real app this would be imported from a shared db module
const carts: Record<string, any[]> = {};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { item, deviceId = 'anonymous' } = payload;
    
    if (!carts[deviceId]) {
      carts[deviceId] = [];
    }
    
    // Check if item already exists
    const existingIndex = carts[deviceId].findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      carts[deviceId][existingIndex].quantity += (item.quantity || 1);
    } else {
      carts[deviceId].push(item);
    }

    return NextResponse.json({
      success: true,
      message: 'Item added to cart'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to add item' });
  }
}
