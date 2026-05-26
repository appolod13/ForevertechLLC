import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = (request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http").trim();
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host).trim();
  return `${proto}://${host}`;
}

function getClientId() {
  return (process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim();
}

function getClientSecret() {
  return (process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim();
}

async function exchangeCodeForToken(params: { code: string; callbackUrl: string }) {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) throw new Error("YouTube OAuth credentials missing");

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("code", params.code);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", params.callbackUrl);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
        token_type?: string;
        error?: string;
        error_description?: string;
      }
    | null;
  if (!res.ok || !json?.access_token) {
    const msg = json?.error_description || json?.error || "YouTube OAuth code exchange failed";
    throw new Error(msg);
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || "",
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : 3600,
    scope: json.scope || "",
  };
}

async function fetchChannelTitle(accessToken: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as
    | { items?: Array<{ snippet?: { title?: string } }> }
    | { error?: { message?: string } }
    | null;
  if (!res.ok) return undefined;
  const title = json && "items" in json ? json.items?.[0]?.snippet?.title : undefined;
  return typeof title === "string" && title.trim() ? title.trim() : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const origin = requestOrigin(request);
  const callbackUrl = (process.env.YOUTUBE_REDIRECT_URI || "").trim() || `${origin}/api/auth/youtube/callback`;
  const redirectUrl = new URL("/studio", origin);

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("youtube_oauth_state")?.value;
  cookieStore.delete("youtube_oauth_state");

  if (!code || !state || !expectedState || expectedState !== state) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const token = await exchangeCodeForToken({ code: decodeURIComponent(code), callbackUrl });
    const channelTitle = await fetchChannelTitle(token.accessToken);

    cookieStore.set("youtube_user_token", token.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: token.expiresIn,
      path: "/",
      sameSite: "lax",
    });

    if (token.refreshToken) {
      cookieStore.set("youtube_user_refresh_token", token.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
      });
    }

    cookieStore.set("youtube_screen_name", channelTitle || "youtube", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(redirectUrl);
  }
}
