import { NextResponse } from 'next/server';
import { getGalleryItems, addGalleryItem } from '@/lib/galleryStore';

export async function GET() {
  return NextResponse.json({ success: true, items: getGalleryItems() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newItem = addGalleryItem({
      imageUrl: body.imageUrl,
      prompt: body.prompt || 'Generated Image',
      userName: body.userName || 'Anonymous User',
      catalogName: body.catalogName || 'Default Catalog',
      userId: body.userId || 'anonymous',
    });
    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Failed to add gallery item', error);
    return NextResponse.json({ success: false, error: 'Failed to add to gallery' }, { status: 500 });
  }
}