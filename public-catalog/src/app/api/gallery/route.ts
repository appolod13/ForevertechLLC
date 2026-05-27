import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getGalleryItems, addGalleryItem } from '@/lib/galleryStore';

export async function GET() {
  const supabase = getServiceSupabase();
  
  if (supabase) {
    const { data, error } = await supabase
      .from('gallery_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = data.map(item => ({
      id: item.id,
      imageUrl: item.image_url,
      prompt: item.prompt,
      userName: item.user_name,
      catalogName: item.catalog_name,
      userId: item.user_id,
      deviceId: item.device_id,
      isFavorite: item.is_favorite,
      isQuantumVerified: item.is_quantum_verified,
      isNft: item.is_nft,
      nftId: item.nft_id,
      createdAt: item.created_at
    }));

    return NextResponse.json({ success: true, items });
  } else {
    // Fallback to in-memory store if Supabase isn't configured
    return NextResponse.json({ success: true, items: getGalleryItems() });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('gallery_items')
        .insert({
          image_url: body.imageUrl,
          prompt: body.prompt || 'Generated Image',
          user_name: body.userName || 'Anonymous User',
          catalog_name: body.catalogName || 'Default Catalog',
          user_id: body.userId || 'anonymous',
          device_id: body.deviceId || undefined,
          is_quantum_verified: body.isQuantumVerified || false,
          is_nft: body.isNft || false,
          nft_id: body.nftId || undefined
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const newItem = {
        id: data.id,
        imageUrl: data.image_url,
        prompt: data.prompt,
        userName: data.user_name,
        catalogName: data.catalog_name,
        userId: data.user_id,
        deviceId: data.device_id,
        isFavorite: data.is_favorite,
        isQuantumVerified: data.is_quantum_verified,
        isNft: data.is_nft,
        nftId: data.nft_id,
        createdAt: data.created_at
      };

      return NextResponse.json({ success: true, item: newItem });
    } else {
      // Fallback to in-memory store if Supabase isn't configured
      const newItem = addGalleryItem({
        imageUrl: body.imageUrl,
        prompt: body.prompt || 'Generated Image',
        userName: body.userName || 'Anonymous User',
        catalogName: body.catalogName || 'Default Catalog',
        userId: body.userId || 'anonymous',
        deviceId: body.deviceId || undefined,
        isQuantumVerified: body.isQuantumVerified || false,
        isNft: body.isNft || false,
        nftId: body.nftId || undefined
      });
      return NextResponse.json({ success: true, item: newItem });
    }
  } catch (error) {
    console.error('Failed to add gallery item', error);
    return NextResponse.json({ success: false, error: 'Failed to add to gallery' }, { status: 500 });
  }
}
