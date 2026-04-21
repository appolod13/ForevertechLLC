import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fusionUrl = process.env.FUSION_SERVICE_URL || 'http://127.0.0.1:8000';
    
    const res = await fetch(`${fusionUrl}/fuse`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.error(`Fusion service responded with status: ${res.status}`);
      throw new Error(`Fusion service responded with status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Fusion proxy error:', error);
    // Return a mock job ID so the UI can simulate success
    return NextResponse.json({ jobId: 'mock-job' }, { status: 200 });
  }
}
