import { NextResponse } from "next/server";
import Stripe from "stripe";
import { randomBytes } from "crypto";
import { supabaseInsertSingle, supabaseSelectSingle } from "@/lib/supabaseRest";
import { getRequestOrigin } from "@/lib/siteOrigin";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(secretKey);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown, maxLen = 300): string {
  const s = typeof v === "string" ? v : "";
  const t = s.trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function toDownloadUrl(imageUrl: string): string {
  const u = imageUrl.trim();
  if (!u) return "";
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice("ipfs://".length)}`;
  if (u.startsWith("Qm") || u.startsWith("bafy")) return `https://ipfs.io/ipfs/${u}`;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return u;
}

function makeRegenCode(): string {
  const raw = randomBytes(12).toString("base64url");
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return cleaned.slice(0, 16);
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const body: unknown = await request.json().catch(() => ({} as unknown));
    const b = isRecord(body) ? body : {};
    const galleryItemId = getString(b.galleryItemId, 80);
    const deviceId = getString(b.deviceId, 128) || "anonymous";
    const userId = getString(b.userId, 128);
    const customerEmail = getString(b.customerEmail, 200);

    if (!galleryItemId) {
      return NextResponse.json({ success: false, error: "missing_galleryItemId" }, { status: 400 });
    }

    const origin = getRequestOrigin(request);
    if (!origin) {
      return NextResponse.json({ success: false, error: "missing_origin" }, { status: 500 });
    }

    const item = await supabaseSelectSingle<{
      id: string;
      image_url: string;
      prompt: string;
      user_name: string;
      catalog_name: string;
    }>({
      table: "gallery_items",
      select: "id,image_url,prompt,user_name,catalog_name",
      filters: { id: `eq.${galleryItemId}` },
    });

    if (!item.ok) {
      return NextResponse.json({ success: false, error: item.error }, { status: item.status });
    }

    const feeEnv = (process.env.PIXELQRYPT_REGEN_FEE_CENTS || "").trim();
    const feeRaw = feeEnv ? Number(feeEnv) : 299;
    const feeCents = Number.isFinite(feeRaw) ? Math.max(0, Math.min(50_000, Math.trunc(feeRaw))) : 299;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "PixelQrypt™ Download Access Code",
              images: item.data.image_url ? [toDownloadUrl(item.data.image_url)] : [],
              description: item.data.prompt ? getString(item.data.prompt, 400) : undefined,
            },
            unit_amount: feeCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/pixelqrypt?galleryItemId=${encodeURIComponent(galleryItemId)}&session_id={CHECKOUT_SESSION_ID}&success=1`,
      cancel_url: `${origin}/pixelqrypt?galleryItemId=${encodeURIComponent(galleryItemId)}&cancel=1`,
      customer_email: customerEmail || undefined,
      metadata: {
        purpose: "pixelqrypt_regen",
        galleryItemId,
        deviceId,
        userId,
        origin,
      },
    });

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "internal_error" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const galleryItemId = getString(searchParams.get("galleryItemId") || searchParams.get("gallery_item_id"), 80);
    const regenCode = getString(searchParams.get("code"), 40);
    const sessionId = getString(searchParams.get("sessionId") || searchParams.get("session_id"), 120);
    const deviceId = getString(searchParams.get("deviceId"), 128);
    const download = getString(searchParams.get("download"), 8) === "1";

    if (galleryItemId && !regenCode && !sessionId && !download) {
      const item = await supabaseSelectSingle<{
        id: string;
        image_url: string;
        prompt: string;
        user_name: string;
        catalog_name: string;
      }>({
        table: "gallery_items",
        select: "id,image_url,prompt,user_name,catalog_name",
        filters: { id: `eq.${galleryItemId}` },
      });
      if (!item.ok) {
        return NextResponse.json({ success: false, error: item.error }, { status: item.status });
      }
      return NextResponse.json({
        success: true,
        galleryItemId: item.data.id,
        imageUrl: item.data.image_url || null,
        prompt: item.data.prompt || null,
        creatorName: item.data.user_name || null,
        catalogName: item.data.catalog_name || null,
      });
    }

    if (!regenCode && !sessionId) {
      return NextResponse.json({ success: false, error: "missing_code_or_session" }, { status: 400 });
    }

    const readEntitlement = async () =>
      supabaseSelectSingle<{
        regen_code: string;
        gallery_item_id: string;
        stripe_session_id?: string;
        created_at: string;
        gallery_items?: { image_url?: string; prompt?: string; user_name?: string; catalog_name?: string } | null;
      }>({
        table: "pixelqrypt_regen_entitlements",
        select: "regen_code,gallery_item_id,stripe_session_id,created_at,gallery_items(image_url,prompt,user_name,catalog_name)",
        filters: regenCode ? { regen_code: `eq.${regenCode}` } : { stripe_session_id: `eq.${sessionId}` },
      });

    let entitlement = await readEntitlement();

    if (!entitlement.ok && sessionId && !regenCode) {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paid = session.payment_status === "paid" || (session as Stripe.Checkout.Session).status === "complete";
      if (!paid) return NextResponse.json({ success: false, error: "session_not_paid" }, { status: 400 });
      if (getString(session.metadata?.purpose) !== "pixelqrypt_regen") {
        return NextResponse.json({ success: false, error: "wrong_session_purpose" }, { status: 400 });
      }
      const sessionDeviceId = getString(session.metadata?.deviceId, 128);
      if (sessionDeviceId && deviceId && sessionDeviceId !== deviceId) {
        return NextResponse.json({ success: false, error: "device_mismatch" }, { status: 403 });
      }
      const gid = getString(session.metadata?.galleryItemId, 80);
      if (!gid) return NextResponse.json({ success: false, error: "missing_galleryItemId" }, { status: 400 });

      let lastErr = "";
      for (let i = 0; i < 5; i++) {
        const code = makeRegenCode();
        const ins = await supabaseInsertSingle<{ regen_code: string; stripe_session_id: string }>({
          table: "pixelqrypt_regen_entitlements",
          row: {
            regen_code: code,
            gallery_item_id: gid,
            stripe_session_id: sessionId,
            purchaser_device_id: sessionDeviceId || deviceId || "",
            purchaser_user_id: getString(session.metadata?.userId, 128) || "",
          },
          select: "regen_code,stripe_session_id",
        });
        if (ins.ok) {
          break;
        }
        lastErr = ins.error;
        if (ins.status !== 409) break;
      }

      entitlement = await readEntitlement();
      if (!entitlement.ok) {
        return NextResponse.json({ success: false, error: lastErr || "not_found" }, { status: 404 });
      }
    }

    if (!entitlement.ok) {
      return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
    }

    const imageUrl = entitlement.data.gallery_items?.image_url ? String(entitlement.data.gallery_items.image_url) : "";
    const downloadable = toDownloadUrl(imageUrl);

    if (download) {
      if (!downloadable) return NextResponse.json({ success: false, error: "missing_image" }, { status: 400 });
      const res = await fetch(downloadable, { cache: "no-store" }).catch(() => null);
      if (!res || !res.ok) return NextResponse.json({ success: false, error: "download_failed" }, { status: 502 });
      const contentType = res.headers.get("content-type") || "application/octet-stream";
      const buf = await res.arrayBuffer();
      const filename = `pixelqrypt_${entitlement.data.regen_code}.png`;
      return new Response(buf, {
        status: 200,
        headers: {
          "content-type": contentType,
          "content-disposition": `attachment; filename="${filename}"`,
          "cache-control": "no-store",
        },
      });
    }

    return NextResponse.json({
      success: true,
      regenCode: entitlement.data.regen_code,
      galleryItemId: entitlement.data.gallery_item_id,
      createdAt: entitlement.data.created_at,
      imageUrl: imageUrl || null,
      prompt: entitlement.data.gallery_items?.prompt || null,
      creatorName: entitlement.data.gallery_items?.user_name || null,
      catalogName: entitlement.data.gallery_items?.catalog_name || null,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "internal_error" },
      { status: 500 },
    );
  }
}
