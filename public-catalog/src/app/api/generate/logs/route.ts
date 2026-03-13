import { recentLogs } from "@/lib/api/logger";
import { ok } from "@/lib/api/response";

export async function GET() {
  return ok({ logs: recentLogs() });
}
