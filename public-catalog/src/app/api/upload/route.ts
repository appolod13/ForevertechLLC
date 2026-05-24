import { NextResponse } from 'next/server';

function sniffImageMime(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 8) {
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.subarray(0, 8).equals(pngSig)) return { mime: 'image/png', ext: 'png' };
  }
  if (buffer.length >= 3) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buffer.length >= 12) {
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  }
  if (buffer.length >= 6) {
    const hdr = buffer.subarray(0, 6).toString('ascii');
    if (hdr === 'GIF87a' || hdr === 'GIF89a') return { mime: 'image/gif', ext: 'gif' };
  }
  return null;
}

function isZipLike(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  const sig = buffer.subarray(0, 4);
  return (
    sig.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
    sig.equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) ||
    sig.equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]))
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No image uploaded' }, { status: 400 });
    }

    const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || '') || 8 * 1024 * 1024;
    if (typeof file.size === 'number' && file.size > maxBytes) {
      return NextResponse.json({ success: false, error: `File too large (max ${Math.round(maxBytes / (1024 * 1024))}MB)` }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isZipLike(buffer)) {
      return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 415 });
    }

    const sniffed = sniffImageMime(buffer);
    if (!sniffed) {
      return NextResponse.json({ success: false, error: 'Only image uploads are allowed (PNG/JPG/WebP/GIF)' }, { status: 415 });
    }

    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
    if (file.type && !allowed.has(file.type)) {
      return NextResponse.json({ success: false, error: 'Only image uploads are allowed (PNG/JPG/WebP/GIF)' }, { status: 415 });
    }

    const base64 = `data:${sniffed.mime};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      url: base64,
      localUrl: base64
    });
  } catch (error) {
    console.error('Error in /api/upload:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
