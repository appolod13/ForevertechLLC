import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fusionUrl = process.env.FUSION_SERVICE_URL || 'http://127.0.0.1:8000';
    
    const res = await fetch(`${fusionUrl}/brain/roulette`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`Fusion service responded with status: ${res.status}`);
      throw new Error(`Fusion service responded with status: ${res.status}`);
    }

    const imageBuffer = await res.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error: unknown) {
    console.error('Brain roulette proxy error:', error);
    const mockSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
        <rect width="100%" height="100%" fill="#1a1a2e"/>
        <text x="50%" y="50%" font-family="system-ui" font-size="24" fill="#60a5fa" text-anchor="middle">
          Mock Brain Randomizer Image
        </text>
        <text x="50%" y="60%" font-family="system-ui" font-size="16" fill="#9ca3af" text-anchor="middle">
          (Fusion Service Offline)
        </text>
      </svg>
    `;
    return new NextResponse(mockSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    });
  }
}
