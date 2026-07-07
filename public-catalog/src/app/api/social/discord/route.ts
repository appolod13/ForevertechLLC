import { NextResponse } from 'next/server';

import { getServiceSupabase } from '@/lib/supabase';

function getString(value: unknown, maxLen = 4000) {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isDiscordWebhookUrl(value: string) {
  return /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/[^/\s]+\/[^/\s]+$/i.test(value);
}

function redactWebhook(value: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    const tail = parts.length ? parts[parts.length - 1] : '';
    const masked = tail ? `${tail.slice(0, 3)}...${tail.slice(-3)}` : 'configured';
    return `${url.origin}/.../${masked}`;
  } catch {
    return 'Discord webhook configured';
  }
}

async function loadDestination(userId: string) {
  const supabase = getServiceSupabase();
  if (!supabase) return { data: null, error: 'supabase_not_configured' as const };
  const result = await supabase
    .from('user_social_destinations')
    .select('webhook_url')
    .eq('user_id', userId)
    .eq('platform', 'discord')
    .maybeSingle();
  return { data: result.data as { webhook_url?: string } | null, error: result.error };
}

export async function GET(request: Request) {
  const userId = getString(new URL(request.url).searchParams.get('userId'));
  if (!userId) return NextResponse.json({ success: false, error: 'missing_user_id' }, { status: 400 });

  const { data, error } = await loadDestination(userId);
  if (error && error !== 'supabase_not_configured') {
    return NextResponse.json({ success: false, error: 'discord_destination_lookup_failed' }, { status: 500 });
  }

  const webhookUrl = getString(data?.webhook_url);
  return NextResponse.json({
    success: true,
    connected: Boolean(webhookUrl),
    webhookDisplay: webhookUrl ? redactWebhook(webhookUrl) : '',
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = getString(body.userId, 200);
  const webhookUrl = getString(body.webhookUrl);

  if (!userId) return NextResponse.json({ success: false, error: 'missing_user_id' }, { status: 400 });
  if (!isDiscordWebhookUrl(webhookUrl)) {
    return NextResponse.json({ success: false, error: 'invalid_discord_webhook' }, { status: 400 });
  }

  const verifyRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'PixelQrypt Discord webhook connected.' }),
  }).catch(() => null);

  if (!verifyRes || !verifyRes.ok) {
    return NextResponse.json({ success: false, error: 'discord_webhook_verification_failed' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ success: false, error: 'supabase_not_configured' }, { status: 500 });

  const { error } = await supabase.from('user_social_destinations').upsert(
    {
      user_id: userId,
      platform: 'discord',
      webhook_url: webhookUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform' },
  );

  if (error) return NextResponse.json({ success: false, error: 'discord_destination_save_failed' }, { status: 500 });

  return NextResponse.json({
    success: true,
    connected: true,
    webhookDisplay: redactWebhook(webhookUrl),
  });
}

export async function DELETE(request: Request) {
  const userId = getString(new URL(request.url).searchParams.get('userId'));
  if (!userId) return NextResponse.json({ success: false, error: 'missing_user_id' }, { status: 400 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ success: false, error: 'supabase_not_configured' }, { status: 500 });

  const { error } = await supabase.from('user_social_destinations').delete().eq('user_id', userId).eq('platform', 'discord');
  if (error) return NextResponse.json({ success: false, error: 'discord_destination_delete_failed' }, { status: 500 });

  return NextResponse.json({ success: true, connected: false });
}
