import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

type SessionPayload = { email: string; iat: number; exp: number; nonce: string };

const COOKIE_NAME = "ft_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64url(s: string): Buffer {
  const padLen = (4 - (s.length % 4)) % 4;
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
  return Buffer.from(padded, "base64");
}

function secret(): string {
  const s = (process.env.ADMIN_SESSION_SECRET || "").trim();
  if (s) return s;
  if (process.env.NODE_ENV !== "production") {
    const g = globalThis as unknown as { __ftAdminDevSecret?: string };
    if (!g.__ftAdminDevSecret) {
      g.__ftAdminDevSecret = base64url(randomBytes(32));
    }
    return g.__ftAdminDevSecret;
  }
  throw new Error("missing_ADMIN_SESSION_SECRET");
}

function sign(data: string): string {
  return base64url(createHmac("sha256", secret()).update(data).digest());
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function adminCookieName(): string {
  return COOKIE_NAME;
}

export function validateAdminCredentials(email: string, password: string): boolean {
  const e = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const p = (process.env.ADMIN_PASSWORD || "").trim();
  if (!e || !p) return false;
  return email.trim().toLowerCase() === e && password === p;
}

export function createAdminSessionToken(email: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    email,
    iat: nowSec,
    exp: nowSec + SESSION_MAX_AGE_SECONDS,
    nonce: base64url(Buffer.from(String(Math.random()))).slice(0, 12),
  };

  const header = { alg: "HS256", typ: "JWT" };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const sig = sign(`${h}.${p}`);
  return `${h}.${p}.${sig}`;
}

export function verifyAdminSessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = sign(`${h}.${p}`);
  if (!safeEqual(sig, expected)) return null;

  try {
    const payload = JSON.parse(fromBase64url(p).toString("utf8")) as SessionPayload;
    if (!payload || typeof payload.email !== "string") return null;
    if (typeof payload.exp !== "number") return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSec) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getAdminSession(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value || "";
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export function requireAdmin(req: NextRequest): { ok: true; session: SessionPayload } | { ok: false } {
  const session = getAdminSession(req);
  if (!session) return { ok: false };
  return { ok: true, session };
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
