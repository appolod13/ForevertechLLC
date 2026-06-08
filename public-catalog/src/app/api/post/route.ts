import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TwitterApi } from "twitter-api-v2";

export async function POST(req: Request) {
  const { tweetText, platforms, mediaUrl } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let mediaId: string | undefined;
  const results: { [key: string]: { success: boolean; error?: string } } = {};

  const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY!,
    appSecret: process.env.TWITTER_CONSUMER_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
  });

  const client = twitterClient.readWrite;

  try {
    if (mediaUrl) {
      const response = await fetch(mediaUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      mediaId = await twitterClient.v1.uploadMedia(buffer, { mimeType: 'image/png' });
    }

    if (platforms.includes("twitter")) {
      try {
        await client.v2.tweet({
          text: tweetText.substring(0, 280), // Ensure we don't exceed Twitter limits
          ...(mediaId ? { media: { medi-ids: [mediaId] } } : {})
        });

        results.twitter = { success: true };
      } catch (e: any) {
        console.error("Error posting to Twitter:", e);
        results.twitter = { success: false, error: e.message };
      }
    }

    // ... other platforms

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
