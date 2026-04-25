import { NextResponse } from 'next/server';
import { toggleFavorite } from '@/lib/galleryStore';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = toggleFavorite(id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Failed to toggle favorite', error);
    return NextResponse.json({ success: false, error: 'Failed to toggle favorite' }, { status: 500 });
  }
}