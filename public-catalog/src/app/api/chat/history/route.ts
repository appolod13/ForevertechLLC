import { ok } from "@/lib/api/response";
import { getMessages } from "../_state";

export async function GET() {
  return ok({ messages: getMessages() });
}

