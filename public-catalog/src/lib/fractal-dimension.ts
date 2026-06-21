export function calculateFractalDimension(prompt: string): { value: number; method: string; label: string } {
  const p = prompt.toLowerCase();

  // Analytical values for well-known fractals
  if (p.includes('koch')) {
    return {
      value: Math.log(4) / Math.log(3),
      method: 'analytical',
      label: 'Koch Curve'
    };
  }
  if (p.includes('sierpinski')) {
    return {
      value: Math.log(3) / Math.log(2),
      method: 'analytical',
      label: 'Sierpinski Triangle'
    };
  }
  if (p.includes('mandelbrot') || p.includes('julia')) {
    return {
      value: 2.0, // boundary dimension
      method: 'analytical',
      label: 'Mandelbrot / Julia Set'
    };
  }

  // Fallback estimate for hybrid / unknown
  const base = 1.35 + (p.length % 7) * 0.04;
  return {
    value: Math.min(1.95, Math.max(1.2, base)),
    method: 'estimate',
    label: 'Hybrid L-System Estimate'
  };
}

// Simple box-counting dimension (client-side friendly version)
export function estimateBoxCountingDimension(imageData: ImageData, samples = 8): number {
  const { width, height, data } = imageData;
  const gray: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    gray.push((r + g + b) / 3 / 255);
  }

  const sizes = [2, 4, 8, 16, 32].slice(0, samples);
  const counts: number[] = [];

  for (const size of sizes) {
    let count = 0;
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        let hasContent = false;
        for (let dy = 0; dy < size && !hasContent; dy++) {
          for (let dx = 0; dx < size && !hasContent; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            if (data[idx] > 30 || data[idx + 1] > 30 || data[idx + 2] > 30) {
              hasContent = true;
            }
          }
        }
        if (hasContent) count++;
      }
    }
    counts.push(count);
  }

  // Simple linear regression on log-log
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = sizes.length;
  for (let i = 0; i < n; i++) {
    const lx = Math.log(sizes[i]);
    const ly = Math.log(counts[i] || 1);
    sumX += lx;
    sumY += ly;
    sumXY += lx * ly;
    sumX2 += lx * lx;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return Math.max(1.0, Math.min(2.0, -slope));
}
