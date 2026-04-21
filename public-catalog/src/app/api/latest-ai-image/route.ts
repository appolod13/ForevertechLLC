import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), '..', 'quantum-image-gen', 'images');
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png'));
      if (files.length > 0) {
        files.sort((a, b) => b.localeCompare(a));
        const latest = files[0];
        return NextResponse.json({
          success: true,
          imageUrl: `http://127.0.0.1:5328/images/${latest}`,
          filename: latest
        });
      }
    }
  } catch (e) {
    // fallback below
  }

  return NextResponse.json({
    success: true,
    imageUrl: '/images/ai-gen-1.png',
    filename: 'ai-gen-1.png'
  });
}
