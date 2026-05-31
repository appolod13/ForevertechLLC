import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function sanitizePublicBaseUrl(value: unknown): string {
  const raw = asNonEmptyString(value);
  if (!raw) return "";

  const fixedScheme = raw.replace(/^(https?)\/\//, "$1://");

  try {
    const u = new URL(fixedScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    if (process.env.NODE_ENV === "production") {
      if (u.protocol !== "https:") return "";
      const hostname = u.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "127.0.0.1") return "";
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export const MIRROR_API_URL = sanitizePublicBaseUrl(process.env.NEXT_PUBLIC_MIRROR_API_URL);
