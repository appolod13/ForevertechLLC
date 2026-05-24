import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = (request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http").trim();
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host).trim();
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const clientId = (process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "YouTube OAuth credentials missing" }, { status: 500 });
  }

  const origin = requestOrigin(request);
  const callbackUrl = (process.env.YOUTUBE_REDIRECT_URI || "").trim() || `${origin}/api/auth/youtube/callback`;

  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("youtube_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15,
    path: "/",
    sameSite: "lax",
  });

  const scope = (process.env.YOUTUBE_SCOPES || "").trim() || "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("include_granted_scopes", "true");

  return NextResponse.redirect(authUrl.toString());
}
