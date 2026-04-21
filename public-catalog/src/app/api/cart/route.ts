import { NextResponse } from 'next/server';

// Temporary mock in-memory store for carts (device_id -> cart items)
// In a real app this would be a database
const carts: Record<string, any[]> = {};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'anonymous';
    
    return NextResponse.json({
      success: true,
      items: carts[deviceId] || []
    });
  } catch (error) {
    return NextResponse.json({ success: false, items: [] });
  }
}
