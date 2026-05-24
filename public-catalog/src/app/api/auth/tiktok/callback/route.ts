import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = (request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http").trim();
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host).trim();
  return `${proto}://${host}`;
}

function getClientKey() {
  return (process.env.TIKTOK_CLIENT_KEY || "").trim();
}

function getClientSecret() {
  return (process.env.TIKTOK_CLIENT_SECRET || "").trim();
}

async function exchangeCodeForToken(params: { code: string; callbackUrl: string }) {
  const clientKey = getClientKey();
  const clientSecret = getClientSecret();
  if (!clientKey || !clientSecret) throw new Error("TikTok credentials missing");

  const body = new URLSearchParams();
  body.set("client_key", clientKey);
  body.set("client_secret", clientSecret);
  body.set("code", params.code);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", params.callbackUrl);

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
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
        refresh_expires_in?: number;
        open_id?: string;
        scope?: string;
        error?: string;
        error_description?: string;
      }
    | null;
  if (!res.ok || !json?.access_token || !json.open_id) {
    const msg = json?.error_description || json?.error || "Failed to exchange TikTok code";
    throw new Error(msg);
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || "",
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : 60 * 60 * 24,
    refreshExpiresIn: typeof json.refresh_expires_in === "number" ? json.refresh_expires_in : 60 * 60 * 24 * 365,
    openId: json.open_id,
    scope: json.scope || "",
  };
}

async function fetchTikTokDisplayName(accessToken: string) {
  const url = new URL("https://open.tiktokapis.com/v2/user/info/");
  url.searchParams.set("fields", "open_id,display_name,avatar_url");
  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as
    | { data?: { user?: { display_name?: string } }; error?: { code?: string; message?: string } }
    | null;
  if (!res.ok) return undefined;
  const name = json?.data?.user?.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const origin = requestOrigin(request);
  const callbackUrl = (process.env.TIKTOK_REDIRECT_URI || "").trim() || `${origin}/api/auth/tiktok/callback`;
  const redirectUrl = new URL("/studio", origin);

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("tiktok_oauth_state")?.value;
  cookieStore.delete("tiktok_oauth_state");

  if (!code || !state || !expectedState || expectedState !== state) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const token = await exchangeCodeForToken({ code: decodeURIComponent(code), callbackUrl });
    const displayName = await fetchTikTokDisplayName(token.accessToken);

    cookieStore.set("tiktok_user_token", token.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: token.expiresIn,
      path: "/",
      sameSite: "lax",
    });

    if (token.refreshToken) {
      cookieStore.set("tiktok_user_refresh_token", token.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: token.refreshExpiresIn,
        path: "/",
        sameSite: "lax",
      });
    }

    cookieStore.set("tiktok_user_id", token.openId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: token.refreshExpiresIn,
      path: "/",
      sameSite: "lax",
    });

    cookieStore.set("tiktok_screen_name", displayName || "tiktok", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: token.refreshExpiresIn,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(redirectUrl);
  }
}
