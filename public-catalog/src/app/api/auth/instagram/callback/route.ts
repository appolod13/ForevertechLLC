import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const proto = (request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http").trim();
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host).trim();
  return `${proto}://${host}`;
}

function getAppId() {
  return (process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || "").trim();
}

function getAppSecret() {
  return (process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || "").trim();
}

async function exchangeCodeForToken(params: { code: string; callbackUrl: string }) {
  const appId = getAppId();
  const appSecret = getAppSecret();
  if (!appId || !appSecret) throw new Error("Instagram app credentials missing");

  const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", params.callbackUrl);
  tokenUrl.searchParams.set("code", params.code);

  const res = await fetch(tokenUrl.toString(), { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; token_type?: string; expires_in?: number }
    | { error?: { message?: string } }
    | null;

  if (!res.ok || !json || !("access_token" in json) || !json.access_token) {
    const msg = (json && "error" in json && json.error?.message) ? json.error.message : "Failed to exchange code";
    throw new Error(msg);
  }

  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

async function exchangeForLongLivedToken(shortLivedToken: string) {
  const appId = getAppId();
  const appSecret = getAppSecret();
  if (!appId || !appSecret) throw new Error("Instagram app credentials missing");

  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; token_type?: string; expires_in?: number }
    | { error?: { message?: string } }
    | null;

  if (!res.ok || !json || !("access_token" in json) || !json.access_token) {
    const msg = (json && "error" in json && json.error?.message) ? json.error.message : "Failed to exchange for long-lived token";
    throw new Error(msg);
  }

  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

async function findInstagramBusinessAccount(accessToken: string) {
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(accessToken)}`,
    { cache: "no-store" }
  );
  const pagesJson = (await pagesRes.json().catch(() => null)) as
    | { data?: Array<{ id: string; name?: string; access_token?: string }> }
    | { error?: { message?: string } }
    | null;

  if (!pagesRes.ok || !pagesJson || !("data" in pagesJson) || !pagesJson.data?.length) {
    const msg = (pagesJson && "error" in pagesJson && pagesJson.error?.message) ? pagesJson.error.message : "No pages available";
    throw new Error(msg);
  }

  for (const page of pagesJson.data) {
    const pageToken = page.access_token || accessToken;
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(page.id)}?fields=instagram_business_account&access_token=${encodeURIComponent(pageToken)}`,
      { cache: "no-store" }
    );
    const json = (await res.json().catch(() => null)) as
      | { instagram_business_account?: { id?: string } }
      | { error?: { message?: string } }
      | null;

    const igId = json && "instagram_business_account" in json ? json.instagram_business_account?.id : undefined;
    if (igId) {
      return { igUserId: igId, pageId: page.id, pageAccessToken: pageToken };
    }
  }

  throw new Error("No Instagram business account connected to your pages");
}

async function fetchInstagramUsername(igUserId: string, accessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${encodeURIComponent(igUserId)}?fields=username&access_token=${encodeURIComponent(accessToken)}`,
    { cache: "no-store" }
  );
  const json = (await res.json().catch(() => null)) as { username?: string } | null;
  return (json?.username || "").trim() || undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const origin = requestOrigin(request);
  const callbackUrl = (process.env.INSTAGRAM_CALLBACK_URL || "").trim() || `${origin}/api/auth/instagram/callback`;

  const redirectUrl = new URL("/studio", origin);

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("instagram_oauth_state")?.value;
  cookieStore.delete("instagram_oauth_state");

  if (!code || !state || !expectedState || expectedState !== state) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const shortLived = await exchangeCodeForToken({ code, callbackUrl });
    const longLived = await exchangeForLongLivedToken(shortLived.accessToken);
    const { igUserId, pageAccessToken } = await findInstagramBusinessAccount(longLived.accessToken);
    const username = await fetchInstagramUsername(igUserId, pageAccessToken);

    cookieStore.set("instagram_user_token", pageAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: typeof longLived.expiresIn === "number" ? longLived.expiresIn : 60 * 60 * 24 * 60,
      path: "/",
      sameSite: "lax",
    });

    cookieStore.set("instagram_user_id", igUserId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: typeof longLived.expiresIn === "number" ? longLived.expiresIn : 60 * 60 * 24 * 60,
      path: "/",
      sameSite: "lax",
    });

    if (username) {
      cookieStore.set("instagram_screen_name", username, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: typeof longLived.expiresIn === "number" ? longLived.expiresIn : 60 * 60 * 24 * 60,
        path: "/",
        sameSite: "lax",
      });
    } else {
      cookieStore.set("instagram_screen_name", "instagram", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: typeof longLived.expiresIn === "number" ? longLived.expiresIn : 60 * 60 * 24 * 60,
        path: "/",
        sameSite: "lax",
      });
    }

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(redirectUrl);
  }
}
