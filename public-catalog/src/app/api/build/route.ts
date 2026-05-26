import { NextRequest, NextResponse } from "next/server";
import { logInfo, logError } from "@/lib/api/logger";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  try {
    logInfo("build.pipeline.triggered", { timestamp: Date.now() });

    // In a real scenario, this might trigger a GitHub Action, Vercel build,
    // or a custom script in the Oracle Cloud deployment environment.
    // For now, we simulate a successful build trigger.

    return NextResponse.json({ success: true, message: "Build pipeline triggered successfully." });
  } catch (error) {
    logError("build.pipeline.error", error);
    return NextResponse.json({ success: false, error: "Failed to trigger build pipeline." }, { status: 500 });
  }
}
