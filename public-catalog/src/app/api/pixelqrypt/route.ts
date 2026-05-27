import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const { galleryItemId, hiddenMessage, quantumVerificationCode, quantumJobId, quantumSeedHash, creatorUserId, creatorStripeAccountId } = body;

    if (!galleryItemId || !hiddenMessage || !quantumVerificationCode) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('quantum_hidden_messages')
      .insert({
        gallery_item_id: galleryItemId,
        hidden_message: hiddenMessage,
        quantum_verification_code: quantumVerificationCode,
        quantum_job_id: quantumJobId || null,
        quantum_seed_hash: quantumSeedHash || null,
        creator_user_id: creatorUserId || null,
        creator_stripe_account_id: creatorStripeAccountId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: data });
  } catch (error) {
    console.error('Failed to store PixelQrypt message:', error);
    return NextResponse.json({ success: false, error: 'Failed to store PixelQrypt message' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verificationCode = searchParams.get('code');
    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    if (!verificationCode) {
      return NextResponse.json({ success: false, error: 'Verification code required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('quantum_hidden_messages')
      .select('*')
      .eq('quantum_verification_code', verificationCode)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Invalid PixelQrypt verification code' }, { status: 404 });
    }

    const { data: gallery, error: galleryError } = await supabase
      .from('gallery_items')
      .select('*')
      .eq('id', data.gallery_item_id)
      .single();

    if (galleryError || !gallery) {
      return NextResponse.json({ success: false, error: 'PixelQrypt item not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      hiddenMessage: data.hidden_message, 
      galleryItemId: data.gallery_item_id,
      quantumJobId: data.quantum_job_id,
      quantumSeedHash: data.quantum_seed_hash,
      imageUrl: gallery.image_url,
      prompt: gallery.prompt,
      creatorUserId: data.creator_user_id || gallery.user_id || null,
      creatorStripeAccountId: data.creator_stripe_account_id || null,
    });
  } catch (error) {
    console.error('Failed to retrieve PixelQrypt message:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve PixelQrypt message' }, { status: 500 });
  }
}
