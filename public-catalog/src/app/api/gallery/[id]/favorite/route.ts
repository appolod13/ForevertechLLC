import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getGalleryItems, toggleFavorite } from '@/lib/galleryStore';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    if (supabase) {
      // First, get the current state
      const { data: currentItem, error: fetchError } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !currentItem) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      }

      // Toggle the favorite
      const { data, error: updateError } = await supabase
        .from('gallery_items')
        .update({ is_favorite: !currentItem.is_favorite })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Supabase error:', updateError);
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      const updatedItem = {
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

      return NextResponse.json({ success: true, item: updatedItem });
    } else {
      // Fallback to in-memory store if Supabase isn't configured
      const item = toggleFavorite(id);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, item });
    }
  } catch (error) {
    console.error('Failed to toggle favorite', error);
    return NextResponse.json({ success: false, error: 'Failed to toggle favorite' }, { status: 500 });
  }
}
