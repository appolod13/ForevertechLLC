import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { addMessage } from "../_state";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => ({}));
  const b = isRecord(body) ? body : {};
  const user = typeof b.user === "string" && b.user.trim() ? b.user.trim() : "Guest";
  const text = typeof b.text === "string" ? b.text.trim() : "";
  const assetUrl = typeof b.assetUrl === "string" && b.assetUrl.trim() ? b.assetUrl.trim() : undefined;

  if (!text && !assetUrl) return fail("validation_error", 400, ["text or assetUrl required"]);

  const msg = {
    id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
    time: new Date().toISOString(),
    user,
    text,
    assetUrl,
  };
  addMessage(msg);
  return ok({ message: msg });
}

