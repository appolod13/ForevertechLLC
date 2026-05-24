import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = (request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http").trim();
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host).trim();
  return `${proto}://${host}`;
}

function getClientKey() {
  return (process.env.TIKTOK_CLIENT_KEY || "").trim();
}

export async function GET(request: Request) {
  const clientKey = getClientKey();
  const clientSecret = (process.env.TIKTOK_CLIENT_SECRET || "").trim();
  if (!clientKey || !clientSecret) {
    return NextResponse.json({ error: "TikTok credentials missing" }, { status: 500 });
  }

  const origin = requestOrigin(request);
  const callbackUrl = (process.env.TIKTOK_REDIRECT_URI || "").trim() || `${origin}/api/auth/tiktok/callback`;
  if (!callbackUrl.startsWith("https://")) {
    return NextResponse.json({ error: "TikTok redirect URI must be https. Set TIKTOK_REDIRECT_URI." }, { status: 500 });
  }

  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("tiktok_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15,
    path: "/",
    sameSite: "lax",
  });

  const scope = ((process.env.TIKTOK_SCOPES || "").trim() || "user.info.basic,video.upload").trim();

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", clientKey);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("disable_auto_auth", "0");

  return NextResponse.redirect(authUrl.toString());
}
