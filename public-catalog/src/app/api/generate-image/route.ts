import { NextRequest } from "next/server";
import { POST as IMAGE_POST } from "@/app/api/generate/image/route";

export async function POST(req: NextRequest) {
  return IMAGE_POST(req);
}
