import { NextResponse } from 'next/server';
import { getAiGeneratorsConfig } from '@/lib/aiGeneratorsConfig';
import fs from 'fs';
import path from 'path';

function contentTypeForFilename(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  return 'application/octet-stream';
}

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    
    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    
    // Attempt to locate the image in quantum-image-gen directory
    const imagePath = path.join(process.cwd(), '..', 'quantum-image-gen', 'images', safeFilename);
    
    if (!fs.existsSync(imagePath)) {
      try {
        const cfg = getAiGeneratorsConfig();
        const base = (cfg.quantum.internalBaseUrl || 'http://127.0.0.1:5328').replace(/\/$/, '');
        const url = `${base}/images/${encodeURIComponent(safeFilename)}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const contentType = res.headers.get('content-type') || 'image/png';
          return new NextResponse(ab, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
              Pragma: 'no-cache',
              Expires: '0',
              'Content-Length': String(ab.byteLength),
            },
          });
        }
      } catch {
      }
      return new NextResponse('Image not found', { status: 404 });
    }
    
    const fileBuffer = fs.readFileSync(imagePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentTypeForFilename(safeFilename),
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
        'Content-Length': String(fileBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
