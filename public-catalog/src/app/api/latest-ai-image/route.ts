import { ok, fail } from "@/lib/api/response";
import { getLatestImage } from "@/lib/runtimeState/latestImage";

export async function GET() {
  const latest = getLatestImage();
  if (!latest) return fail("not_found", 404);
  return ok({ imageUrl: latest.imageUrl, filename: latest.filename || "", ts: latest.ts });
}

