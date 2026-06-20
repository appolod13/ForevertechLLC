import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!body.prompt) {
      return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
    }

    // TODO: Add your real image generation logic here later
    return NextResponse.json({ 
      success: true, 
      message: "Endpoint working", 
      received: body 
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Internal error" 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: "GET works" });
}