import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Validate required fields
    if (!payload.content || !payload.platforms) {
      return NextResponse.json({ success: false, error: 'Missing content or platforms' }, { status: 400 });
    }

    const { content, platforms, metadata } = payload as { content: string, platforms: string[], metadata?: { mediaUrl?: string, [key: string]: unknown } };
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

    // Mock other platforms (Instagram, Telegram, TikTok, YouTube)
    for (const p of platforms) {
      if (p !== 'twitter') {
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
