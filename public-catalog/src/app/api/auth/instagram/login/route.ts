import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = (request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http").trim();
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host).trim();
  return `${proto}://${host}`;
}

function getAppId() {
  return (process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || "").trim();
}

export async function GET(request: Request) {
  const appId = getAppId();
  if (!appId) {
    return NextResponse.json({ error: "Instagram app id missing" }, { status: 500 });
  }

  const origin = requestOrigin(request);
  const callbackUrl = (process.env.INSTAGRAM_CALLBACK_URL || "").trim() || `${origin}/api/auth/instagram/callback`;

  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("instagram_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15,
    path: "/",
    sameSite: "lax",
  });

  const scope = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
    "pages_read_engagement",
    "business_management",
  ].join(",");

  const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);

  return NextResponse.redirect(authUrl.toString());
}

