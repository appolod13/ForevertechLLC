import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

type PostMetadata = {
  mediaUrl?: string;
  platformMediaUrls?: Record<string, string | undefined>;
  [key: string]: unknown;
};

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolvePublicUrl(input: string, request: Request) {
  if (!input) return '';
  if (input.startsWith('data:')) return '';
  if (input.startsWith('/')) {
    const hostHeader = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').trim();
    const host = hostHeader.split(',')[0]?.trim() || '';
    const hostname = host.split(':')[0]?.trim().toLowerCase() || '';
    if (!host || isLocalHostname(hostname)) return '';

    const protoHeader = (request.headers.get('x-forwarded-proto') || 'https').trim();
    const proto = protoHeader.split(',')[0]?.trim().toLowerCase() || 'https';
    if (proto !== 'https') return '';

    return `https://${host}${input}`;
  }
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:') return '';
    if (isLocalHostname(u.hostname.toLowerCase())) return '';
    return u.toString();
  } catch {
    return '';
  }
}

async function persistDataUrlToQuantumImagesDir(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid base64 image format');
  const mime = (match[1] || '').trim().toLowerCase();
  const base64 = match[2] || '';
  const ext =
    mime === 'image/png' ? 'png' :
    (mime === 'image/jpeg' || mime === 'image/jpg') ? 'jpg' :
    mime === 'image/webp' ? 'webp' :
    '';
  if (!ext) throw new Error('Unsupported image type for Instagram');
  const buf = Buffer.from(base64, 'base64');

  const dir = path.join(process.cwd(), '..', 'quantum-image-gen', 'images');
  const filename = `ig_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buf);
  return filename;
}

async function igCreateMediaContainer(params: {
  igUserId: string;
  accessToken: string;
  body: Record<string, string>;
}) {
  const url = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(params.igUserId)}/media`);
  url.searchParams.set('access_token', params.accessToken);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params.body),
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null;
  if (!res.ok || !json?.id) {
    throw new Error(json?.error?.message || 'Instagram media container creation failed');
  }
  return json.id;
}

async function igPublishContainer(params: { igUserId: string; accessToken: string; creationId: string }) {
  const url = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(params.igUserId)}/media_publish`);
  url.searchParams.set('access_token', params.accessToken);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: params.creationId }),
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null;
  if (!res.ok || !json?.id) {
    throw new Error(json?.error?.message || 'Instagram media publish failed');
  }
  return json.id;
}

async function igWaitForContainerReady(params: { creationId: string; accessToken: string }) {
  for (let i = 0; i < 15; i++) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(params.creationId)}?fields=status_code&access_token=${encodeURIComponent(params.accessToken)}`,
      { cache: 'no-store' }
    );
    const json = (await res.json().catch(() => null)) as { status_code?: string; error?: { message?: string } } | null;
    if (!res.ok) {
      throw new Error(json?.error?.message || 'Instagram container status check failed');
    }
    const status = (json?.status_code || '').toUpperCase();
    if (status === 'FINISHED') return;
    if (status === 'ERROR') throw new Error('Instagram container failed processing');
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('Instagram container processing timed out');
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Validate required fields
    if (!payload.content || !payload.platforms) {
      return NextResponse.json({ success: false, error: 'Missing content or platforms' }, { status: 400 });
    }

    const { content, platforms, metadata } = payload as { content: string, platforms: string[], metadata?: PostMetadata };
    const mediaUrl = metadata?.mediaUrl;

    const results: Record<string, unknown> = {};

    let hasErrors = false;
    let errorMessage = '';

    // Handle Twitter natively if requested
    if (platforms.includes('twitter')) {
      const appKey = process.env.TWITTER_API_KEY;
      const appSecret = process.env.TWITTER_API_SECRET;
      
      const cookieStore = await cookies();
      const userToken = cookieStore.get('twitter_user_token')?.value;
      const userSecret = cookieStore.get('twitter_user_secret')?.value;

      // Fallback to global ENV tokens if no user token is present (for backwards compatibility/admin posting)
      const accessToken = userToken || process.env.TWITTER_ACCESS_TOKEN;
      const accessSecret = userSecret || process.env.TWITTER_ACCESS_SECRET;

      if (!appKey || !appSecret || !accessToken || !accessSecret) {
        hasErrors = true;
        errorMessage = 'Twitter API credentials are not configured in your .env.local file. Please add TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET.';
        results.twitter = { success: false, error: errorMessage };
      } else {
        try {
          const client = new TwitterApi({
            appKey,
            appSecret,
            accessToken,
            accessSecret,
          });

          let mediaId: string | undefined;

          // If there is an image attached, upload it to Twitter first
          if (mediaUrl) {
            let buffer: Buffer;
            let mimeType = 'image/jpeg';

            if (mediaUrl.startsWith('data:')) {
              const matches = mediaUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              if (matches && matches.length === 3) {
                mimeType = matches[1];
                buffer = Buffer.from(matches[2], 'base64');
              } else {
                throw new Error('Invalid base64 image format');
              }
            } else {
              // Fetch remote image if it's not base64
              let fetchUrl = mediaUrl;
              if (fetchUrl.startsWith('/')) {
                const host = request.headers.get('host') || 'localhost:3001';
                const protocol = host.includes('localhost') ? 'http' : 'https';
                fetchUrl = `${protocol}://${host}${fetchUrl}`;
              }

              const response = await fetch(fetchUrl);
              if (!response.ok) throw new Error(`Failed to download image from ${fetchUrl}`);
              
              const arrayBuffer = await response.arrayBuffer();
              buffer = Buffer.from(arrayBuffer);
              mimeType = response.headers.get('content-type') || 'image/jpeg';
            }

            // Upload the image to Twitter via v1 API
            mediaId = await client.v1.uploadMedia(buffer, { mimeType });
          }

          // Clean up the text (remove the ugly data URL attachment string from the post)
          const tweetText = content.replace(/\(Attached: Generated Image\):.*/g, '').trim();

          // Send the Tweet via v2 API
          await client.v2.tweet({
            text: tweetText.substring(0, 280), // Ensure we don't exceed Twitter limits
            ...(mediaId ? { media: { media_ids: [mediaId] } } : {})
          });

          results.twitter = { success: true };
          console.log('Successfully posted to Twitter!');

        } catch (e: unknown) {
          const err = e as { data?: unknown; code?: number; message?: string };
          console.error('Twitter API error:', err?.data || err);
          const errData = (err?.data || {}) as { reason?: string };
          if (errData.reason === 'client-not-enrolled') {
            hasErrors = true;
            errorMessage = 'Twitter API Error: You must attach your Twitter Developer App to a Project in the Developer Portal to use v2 endpoints.';
            results.twitter = { 
              success: false, 
              error: errorMessage 
            };
          } else if (err.code === 403 || (err.message && err.message.includes('403'))) {
            hasErrors = true;
            errorMessage = 'Twitter API Error (403): Free tier limits exceeded or credentials issue. Please check Twitter Developer Portal.';
            results.twitter = { 
              success: false, 
              error: errorMessage 
            };
          } else {
            hasErrors = true;
            errorMessage = err.message || 'Twitter API request failed';
            results.twitter = { success: false, error: errorMessage };
          }
        }
      }
    }

    if (platforms.includes('instagram')) {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('instagram_user_token')?.value;
      const igUserId = cookieStore.get('instagram_user_id')?.value;

      if (!accessToken || !igUserId) {
        hasErrors = true;
        errorMessage = 'Instagram is not connected. Please sign in to Instagram first.';
        results.instagram = { success: false, error: errorMessage };
      } else {
        try {
          let desiredUrl = metadata?.platformMediaUrls?.instagram || mediaUrl || '';
          if (desiredUrl.startsWith('data:')) {
            const hostHeader = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').trim();
            const host = hostHeader.split(',')[0]?.trim() || '';
            const hostname = host.split(':')[0]?.trim().toLowerCase() || '';
            const protoHeader = (request.headers.get('x-forwarded-proto') || 'https').trim();
            const proto = protoHeader.split(',')[0]?.trim().toLowerCase() || 'https';
            if (!host || isLocalHostname(hostname) || proto !== 'https') {
              throw new Error('Instagram requires posting from a public https domain (not localhost).');
            }
            const filename = await persistDataUrlToQuantumImagesDir(desiredUrl);
            desiredUrl = `/api/images/${filename}`;
          }
          const publicUrl = resolvePublicUrl(desiredUrl, request);
          if (!publicUrl) {
            throw new Error('Instagram requires a public https image/video URL (not data: or localhost).');
          }

          const caption = content.replace(/\(Attached: Generated Image\):.*/g, '').trim();
          const isVideo = /\.(mp4|mov|m4v)$/i.test(publicUrl);

          const instagramResult: Record<string, unknown> = {};

          const feedCreationId = await igCreateMediaContainer({
            igUserId,
            accessToken,
            body: isVideo
              ? { media_type: 'VIDEO', video_url: publicUrl, caption }
              : { image_url: publicUrl, caption },
          });
          if (isVideo) await igWaitForContainerReady({ creationId: feedCreationId, accessToken });
          const feedId = await igPublishContainer({ igUserId, accessToken, creationId: feedCreationId });
          instagramResult.feed = { success: true, id: feedId };

          const storyCreationId = await igCreateMediaContainer({
            igUserId,
            accessToken,
            body: isVideo
              ? { media_type: 'STORIES', video_url: publicUrl }
              : { media_type: 'STORIES', image_url: publicUrl },
          });
          if (isVideo) await igWaitForContainerReady({ creationId: storyCreationId, accessToken });
          const storyId = await igPublishContainer({ igUserId, accessToken, creationId: storyCreationId });
          instagramResult.stories = { success: true, id: storyId };

          if (isVideo) {
            const reelsCreationId = await igCreateMediaContainer({
              igUserId,
              accessToken,
              body: { media_type: 'REELS', video_url: publicUrl, caption },
            });
            await igWaitForContainerReady({ creationId: reelsCreationId, accessToken });
            const reelsId = await igPublishContainer({ igUserId, accessToken, creationId: reelsCreationId });
            instagramResult.reels = { success: true, id: reelsId };
          } else {
            instagramResult.reels = { success: false, error: 'Reels requires a video URL (.mp4/.mov). Provide a video to publish reels.' };
          }

          results.instagram = { success: true, ...instagramResult };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Instagram publish failed';
          hasErrors = true;
          errorMessage = msg;
          results.instagram = { success: false, error: msg };
        }
      }
    }

    // Mock other platforms (Telegram, TikTok, YouTube)
    for (const p of platforms) {
      if (p !== 'twitter' && p !== 'instagram') {
        results[p] = { success: true, mock: true };
      }
    }

    if (hasErrors) {
      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        results 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Posted successfully to all channels',
      results
    });
  } catch (error) {
    console.error('Error in /api/post:', error);
    return NextResponse.json({ success: false, error: 'Failed to create post' }, { status: 500 });
  }
}
