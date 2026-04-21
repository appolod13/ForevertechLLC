
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), '..', 'quantum-image-gen', 'images');
    const files = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
    
    // Filter only PNGs
    const imageFiles = files.filter(f => f.endsWith('.png'));
    
    // Sort by newest first (based on filename timestamp YYYYMMDDTHHMMSSZ)
    imageFiles.sort((a, b) => b.localeCompare(a));
    
    const posts = imageFiles.map((file, index) => {
      // Extract info from filename: 20260419T180004Z_3c12457a81328774_256x256.png
      const parts = file.split('_');
      const timestampStr = parts[0];
      
      // Basic parsing of YYYYMMDDTHHMMSSZ
      let date = new Date();
      if (timestampStr && timestampStr.length >= 15) {
        const y = timestampStr.substring(0,4);
        const m = timestampStr.substring(4,6);
        const d = timestampStr.substring(6,8);
        const h = timestampStr.substring(9,11);
        const min = timestampStr.substring(11,13);
        const s = timestampStr.substring(13,15);
        date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
      }
      
      // Some mock IPFS hash for the latest few to simulate "live the ipfs image generated"
      const ipfsHash = index < 3 ? `Qm${Math.random().toString(36).substring(2, 15)}...` : undefined;

      return {
        id: file,
        content: `Quantum Generated Asset - ${parts.length > 2 ? parts[2].replace('.png', '') : 'Image'}`,
        author: 'Quantum Engine',
        timestamp: date.toISOString(),
        ipfsHash: ipfsHash,
        metadata: {
          title: `Quantum Asset ${file.substring(0, 8)}`,
          mediaUrl: `http://127.0.0.1:5328/images/${file}`,
          priceUsd: 49.99
        }
      };
    });

    return NextResponse.json({
      success: true,
      posts: posts,
    });
  } catch (error) {
    console.error('Error reading quantum images:', error);
    return NextResponse.json({ success: false, posts: [] });
  }
}
