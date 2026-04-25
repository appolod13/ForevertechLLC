import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    
    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    
    // Attempt to locate the image in quantum-image-gen directory
    const imagePath = path.join(process.cwd(), '..', 'quantum-image-gen', 'images', safeFilename);
    
    if (!fs.existsSync(imagePath)) {
      return new NextResponse('Image not found', { status: 404 });
    }
    
    const fileBuffer = fs.readFileSync(imagePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
