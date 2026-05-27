type Provider = 'mock' | 'dalle' | 'stablediffusion' | 'midjourney';
type Platform = 'linkedin' | 'instagram' | 'twitter';

function ratioForPlatform(p: Platform) {
  if (p === 'instagram') return { w: 1080, h: 1080, label: '1:1' };
  if (p === 'twitter') return { w: 1280, h: 720, label: '16:9' };
  return { w: 1200, h: 628, label: '~1.91:1' };
}

function svgPlaceholder(text: string, w: number, h: number) {
  const bg = '#111827';
  const fg = '#60a5fa';
  const t = encodeURIComponent(text.slice(0, 80));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
  <rect width='100%' height='100%' fill='${bg}'/>
  <g font-family='system-ui, -apple-system, Segoe UI' fill='${fg}' text-anchor='middle'>
    <text x='50%' y='45%' font-size='${Math.round(h*0.06)}'>AI Image</text>
    <text x='50%' y='60%' font-size='${Math.round(h*0.04)}'>${t}</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

export async function generateImageForPlatform(provider: Provider, prompt: string, platform: Platform) {
  const { w, h, label } = ratioForPlatform(platform);
  const url = svgPlaceholder(`${platform} ${label}`, w, h);
  return { image_url: url, meta: { provider, width: w, height: h, ratio: label } };
}
