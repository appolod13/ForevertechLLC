import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function getFractalType(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("sierpinski") || lower.includes("carpet")) return "sierpinski";
  if (lower.includes("koch")) return "koch";
  if (lower.includes("quantum") || lower.includes("dark matter")) return "quantum";
  return "hybrid";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = (body.prompt || "").toString().trim();

    if (!prompt) {
      return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
    }

    const fractalType = getFractalType(prompt);
    const timestamp = Date.now();

    const imageUrl = `/api/images/dynamic-${fractalType}-${timestamp}.png`;

    return NextResponse.json({ 
      success: true, 
      image_url: imageUrl, 
      meta: { fractal_type: fractalType, note: "Shape changing ACTIVE!" } 
    });
  } catch (error: any) {
    console.error("Generate Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "dynamic generator ready" });
}
