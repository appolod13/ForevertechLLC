import { getLogs } from '@/lib/logging';

export async function GET() {
  return Response.json({ success: true, logs: getLogs() });
}
