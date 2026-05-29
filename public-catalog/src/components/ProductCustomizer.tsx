'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, Shirt, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import QRCode from 'qrcode';

interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  variants: string[];
  colors: string[];
  image: string;
  printifySkus?: Record<string, string>;
}

export function ProductCustomizer({ initialImageUrl, promptOverride }: { initialImageUrl: string | null; promptOverride?: string | null }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [view, setView] = useState<'front' | 'back'>('front');
  const { addToCart } = useCart();

  useEffect(() => {
    fetch('/api/products')
      .then(async res => {
          if (!res.ok) throw new Error('Failed to fetch products');
          return res.json();
      })
      .then(data => {
        if (data.success) {
          setProducts(data.products);
          if (data.products.length > 0) {
            setSelectedProduct(data.products[0]);
            setSelectedVariant(data.products[0].variants[0]);
            setSelectedColor(data.products[0].colors[0]);
          }
        }
      })
      .catch(err => {
          console.error('Products fetch error:', err);
          // Fallback static products in case API fails
          const fallbackProducts = [
            { id: 'shirt-1', name: 'Premium Tee', description: 'Cotton Tee', basePrice: 49.99, currency: 'usd', variants: ['S', 'M', 'L', 'XL'], colors: ['Black', 'White'], image: '' }
          ];
          setProducts(fallbackProducts);
          setSelectedProduct(fallbackProducts[0]);
          setSelectedVariant(fallbackProducts[0].variants[0]);
          setSelectedColor(fallbackProducts[0].colors[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const PROMPT_STOPWORDS = useMemo(
    () =>
      new Set([
        'a','an','the','and','or','but','with','without','to','of','in','on','for','from','by','at','as','is','are','was','were','be','been','being',
        'this','that','these','those','it','its','your','my','our','their','you','me','we','they','them','i',
        'image','design','shirt','tshirt','tee','print','graphic','art','logo','text','words','watermark','high','quality','ultra','hd','4k','8k'
      ]),
    [],
  );

  const PROMPT_STYLEWORDS = useMemo(
    () =>
      new Set([
        'neon','cinematic','futuristic','cyberpunk','sci','scifi','sci-fi','photoreal','photorealistic','realistic','render','rendered',
        'rainy','foggy','moody','dramatic','wide','closeup','close-up','portrait','landscape','macro','bokeh','volumetric','lighting','haze',
        'ultra','high','quality','detailed','detail','sharp','8k','4k','hd'
      ]),
    [],
  );

  const resolvedPrompt = useMemo(() => {
    if (typeof promptOverride === 'string' && promptOverride.trim()) return promptOverride.trim();
    try {
      const raw = localStorage.getItem('foreverteck.studio.lastImage');
      if (!raw) return '';
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return '';
      const rec = parsed as { prompt?: unknown };
      return typeof rec.prompt === 'string' ? rec.prompt.trim() : '';
    } catch {
      return '';
    }
  }, [promptOverride]);

  const keyword = useMemo(() => {
    const p = (resolvedPrompt || '').toLowerCase();
    const tokens = p.match(/[a-z0-9]+/g) || [];
    for (const t of tokens) {
      if (t.length < 3) continue;
      if (PROMPT_STOPWORDS.has(t)) continue;
      if (PROMPT_STYLEWORDS.has(t)) continue;
      const out = t.slice(0, 24);
      return out ? out.slice(0, 1).toUpperCase() + out.slice(1) : 'Custom';
    }
    const counts = new Map<string, number>();
    for (const t of tokens) {
      if (t.length < 3) continue;
      if (PROMPT_STOPWORDS.has(t)) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    let best = '';
    let bestScore = -1;
    for (const [t, c] of counts.entries()) {
      const score = c * 100 + Math.min(t.length, 24);
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    const fallback = tokens.find((t) => t.length >= 3) || 'custom';
    const out = (best || fallback).slice(0, 24);
    return out ? out.slice(0, 1).toUpperCase() + out.slice(1) : 'Custom';
  }, [PROMPT_STOPWORDS, PROMPT_STYLEWORDS, resolvedPrompt]);

  const bannerText = useMemo(() => {
    const p = (resolvedPrompt || '').toLowerCase();
    const tokens = p.match(/[a-z0-9]+/g) || [];
    const words: string[] = [];
    for (const t of tokens) {
      if (t.length < 3) continue;
      if (PROMPT_STOPWORDS.has(t)) continue;
      if (PROMPT_STYLEWORDS.has(t)) continue;
      words.push(t.slice(0, 12));
      if (words.length >= 12) break;
    }
    const phrase = words.length ? words.join(' ') : keyword;
    return (phrase || 'CUSTOM').toUpperCase().slice(0, 96);
  }, [PROMPT_STOPWORDS, PROMPT_STYLEWORDS, keyword, resolvedPrompt]);

  const backPatternSalt = useMemo(() => {
    const localKey = (() => {
      try {
        const raw = localStorage.getItem('foreverteck.studio.lastImage');
        if (!raw) return '';
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return '';
        const rec = parsed as { imageUrl?: unknown; meta?: unknown };
        if (typeof rec.imageUrl === 'string' && rec.imageUrl.trim()) return rec.imageUrl.trim();
        const meta = rec.meta && typeof rec.meta === 'object' ? (rec.meta as Record<string, unknown>) : null;
        const rid = meta && typeof meta.request_id === 'string' ? meta.request_id : '';
        return rid || '';
      } catch {
        return '';
      }
    })();
    const img = typeof initialImageUrl === 'string' ? initialImageUrl.trim() : '';
    return (img || localKey || '').slice(0, 160);
  }, [initialImageUrl]);

  const backWordSvgDataUrl = useMemo(() => {
    const clean = (bannerText || 'CUSTOM')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^A-Za-z0-9 ]/g, '')
      .trim()
      .slice(0, 96) || 'CUSTOM';
    const width = 800;
    const height = 2000;

    const bgW = 520;
    const bgH = 980;
    const bgX = Math.floor((width - bgW) / 2);
    const bgY = Math.floor((height - bgH) / 2);
    const outerPad = 52;
    const words = clean.split(' ').filter(Boolean).slice(0, 14);
    if (!words.length) words.push('CUSTOM');

    const seed = (() => {
      let h = 2166136261;
      for (let i = 0; i < clean.length; i++) {
        h ^= clean.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    })();

    const rng = (() => {
      let a = seed || 1;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    const cols = Math.min(4, Math.max(2, words.length >= 10 ? 3 : 2));
    const rows = Math.max(1, Math.ceil(words.length / cols));
    const cellW = Math.floor((bgW - outerPad * 2) / cols);
    const cellH = Math.floor((bgH - outerPad * 2) / rows);

    const tiles = words
      .map((word, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const cellCx = bgX + outerPad + c * cellW + Math.floor(cellW / 2);
        const cellCy = bgY + outerPad + r * cellH + Math.floor(cellH / 2);
        const jitterX = Math.floor((rng() - 0.5) * cellW * 0.22);
        const jitterY = Math.floor((rng() - 0.5) * cellH * 0.22);
        const x = cellCx + jitterX;
        const y = cellCy + jitterY;

        const angle = Math.floor(-30 + rng() * 60);
        const fontSizeBase = Math.floor(Math.min(54, Math.max(34, cellH * 0.26)));
        const len = Math.max(1, word.length);
        const fontSize = Math.max(30, Math.min(fontSizeBase, Math.floor(fontSizeBase + (10 - len) * 2)));
        const strokeWidth = Math.max(2, Math.floor(fontSize * 0.1));
        const textLength = Math.max(120, Math.floor(cellW * 0.84));

        return `<g transform="translate(${x} ${y}) rotate(${angle})"><text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="Impact, Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="900" fill="#f2f2f2" stroke="#d9d9d9" stroke-width="${strokeWidth}" paint-order="stroke" textLength="${textLength}" lengthAdjust="spacingAndGlyphs">${word}</text></g>`;
      })
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="rgba(0,0,0,0)"/><rect x="${bgX}" y="${bgY}" width="${bgW}" height="${bgH}" fill="#ff1f5d"/>${tiles}</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [bannerText]);

  const backAbstractSvgDataUrl = useMemo(() => {
    const clean = (bannerText || 'CUSTOM')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^A-Za-z0-9 ]/g, '')
      .trim()
      .slice(0, 96) || 'CUSTOM';
    const width = 800;
    const height = 2000;

    const seed = (() => {
      let h = 2166136261;
      for (let i = 0; i < clean.length; i++) {
        h ^= clean.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      for (let i = 0; i < backPatternSalt.length; i++) {
        h ^= backPatternSalt.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    })();

    const rng = (() => {
      let a = seed || 1;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    const bgW = 520;
    const bgH = 980;
    const bgX = Math.floor((width - bgW) / 2);
    const bgY = Math.floor((height - bgH) / 2);

    const lines = Array.from({ length: 38 })
      .map((_, i) => {
        const y = bgY + Math.floor(bgH * (0.10 + rng() * 0.80));
        const amp = 26 + rng() * 130;
        const freq = 1.1 + rng() * 2.6;
        const phase = rng() * Math.PI * 2;
        const stroke = i % 4 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.35)';
        const sw = 2 + Math.floor(rng() * 4);
        const p0 = `M 0 ${y}`;
        const c1y = y + Math.sin(phase) * amp;
        const c2y = y + Math.sin(phase + freq) * amp;
        const endY = y + Math.sin(phase + freq * 2) * amp * 0.55;
        const d = `${p0} C ${Math.floor(width * 0.33)} ${Math.floor(c1y)}, ${Math.floor(width * 0.66)} ${Math.floor(c2y)}, ${width} ${Math.floor(endY)}`;
        return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity="${0.35 + rng() * 0.4}"/>`;
      })
      .join('');

    const shards = Array.from({ length: 24 })
      .map(() => {
        const cx = Math.floor(rng() * width);
        const cy = bgY + Math.floor(bgH * (0.06 + rng() * 0.88));
        const r = 40 + rng() * 140;
        const rot = -35 + rng() * 70;
        const opacity = 0.06 + rng() * 0.18;
        const fill = rng() > 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.30)';
        const w = Math.max(60, Math.floor(r * (0.6 + rng() * 0.9)));
        const h = Math.max(60, Math.floor(r * (0.6 + rng() * 0.9)));
        return `<g transform="translate(${cx} ${cy}) rotate(${rot})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${Math.floor(12 + rng() * 24)}" ry="${Math.floor(12 + rng() * 24)}" fill="${fill}" opacity="${opacity}"/></g>`;
      })
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="rgba(0,0,0,0)"/><rect x="${bgX}" y="${bgY}" width="${bgW}" height="${bgH}" fill="#ff1f5d"/><g clip-path="url(#clip)"><rect x="${bgX}" y="${bgY}" width="${bgW}" height="${bgH}" fill="rgba(0,0,0,0.10)"/>${shards}${lines}</g><defs><clipPath id="clip"><rect x="${bgX}" y="${bgY}" width="${bgW}" height="${bgH}" rx="0" ry="0"/></clipPath></defs></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [bannerText, backPatternSalt]);

  const qrTargetUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const u = new URL('/pixelqrypt', origin);
    u.searchParams.set('src', 'shirt');
    return u.toString();
  }, []);

  const backPreviewSeed = useMemo(() => {
    const raw = (backPatternSalt || bannerText || '').slice(0, 220);
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }, [backPatternSalt, bannerText]);

  const backPreviewUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const u = new URL('/api/back-preview', origin);
    u.searchParams.set('text', bannerText || 'CUSTOM');
    u.searchParams.set('style', 'abstract');
    if (backPreviewSeed) u.searchParams.set('seed', backPreviewSeed);
    if (qrTargetUrl) u.searchParams.set('qrUrl', qrTargetUrl);
    return `${u.pathname}?${u.searchParams.toString()}`;
  }, [bannerText, backPreviewSeed, qrTargetUrl]);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!qrTargetUrl) return;
    let cancelled = false;
    QRCode.toDataURL(qrTargetUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 280,
      color: { dark: '#26000f', light: '#ff1f5d' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [qrTargetUrl]);

  const handleAddToCart = async () => {
    if (!selectedProduct || !initialImageUrl) return;
    setOrderStatus('processing');
    try {
        const printifySku = selectedProduct.printifySkus?.[selectedVariant] || '';
        const ipfs = (() => {
          try {
            const raw = localStorage.getItem('foreverteck.studio.lastImage');
            if (!raw) return null;
            const parsed: unknown = JSON.parse(raw);
            const rec = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
            const meta = rec && typeof rec.meta === 'object' && rec.meta !== null ? (rec.meta as Record<string, unknown>) : null;
            if (!meta) return null;
            return meta;
          } catch {
            return null;
          }
        })();
        const ipfs_url = ipfs && typeof ipfs.ipfs_url === 'string' ? ipfs.ipfs_url : undefined;
        const ipfs_gateway = ipfs && typeof ipfs.ipfs_gateway === 'string' ? ipfs.ipfs_gateway : undefined;
        const ipfs_cid = ipfs && typeof ipfs.ipfs_cid === 'string' ? ipfs.ipfs_cid : undefined;
        const ipfs_status = ipfs && typeof ipfs.ipfs_status === 'string' ? ipfs.ipfs_status : undefined;
        await addToCart({
            id: `${selectedProduct.id}-${selectedVariant}-${selectedColor}-${Date.now()}`,
            title: `${selectedProduct.name} - ${selectedColor}`,
            price: selectedProduct.basePrice,
            quantity: 1,
            imageUrl: initialImageUrl,
            description: `Customized with your generated artwork. Size: ${selectedVariant}`,
            currency: 'usd',
            size: selectedVariant as ('S' | 'M' | 'L' | 'XL' | 'XXL'),
            originalPrompt: resolvedPrompt,
            metadata: {
                productId: selectedProduct.id,
                color: selectedColor,
                variant: selectedVariant,
                printifySku,
                originalPrompt: resolvedPrompt,
                ipfs_url,
                ipfs_gateway,
                ipfs_cid,
                ipfs_status
            }
        });
        setOrderStatus('success');
        setTimeout(() => setOrderStatus('idle'), 3000);
    } catch (e) {
        console.error('Add to cart error:', e);
        setOrderStatus('error');
    }
  };

  if (loading) return <div className="animate-pulse h-96 bg-zinc-900 rounded-xl"></div>;

  const isMug = Boolean(selectedProduct?.id.includes('mug'));
  const isBackView = !isMug && view === 'back';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900/70"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Preview Area */}
      <div className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
         <div className="absolute left-4 top-4 z-20 flex overflow-hidden rounded-lg border border-zinc-700 bg-black/40 backdrop-blur">
            <button
              type="button"
              onClick={() => setView('front')}
              className={cn(
                'px-3 py-2 text-xs font-semibold',
                view === 'front' ? 'bg-white text-black' : 'text-zinc-200 hover:bg-white/10'
              )}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setView('back')}
              className={cn(
                'px-3 py-2 text-xs font-semibold',
                view === 'back' ? 'bg-white text-black' : 'text-zinc-200 hover:bg-white/10'
              )}
            >
              Back
            </button>
         </div>

         {/* Product Base Layer */}
         <div className={cn("absolute inset-0 flex items-center justify-center", isBackView ? "opacity-100" : "opacity-50")}>
             {isMug ? (
                 <Coffee className="w-[70%] h-[70%] text-zinc-700" />
             ) : (
                 <Shirt strokeWidth={1} className="w-[140%] h-[140%] min-w-[500px] min-h-[500px] text-zinc-700 -mt-[5%]" />
             )}
         </div>
         
         {/* AI Image Overlay */}
         {view === 'front' && initialImageUrl && (
             <div className={cn(
                 "relative z-10 transition-all",
                 isMug 
                    ? "w-1/2 h-1/2 mix-blend-overlay opacity-90 shadow-2xl" 
                    : "w-[35%] h-[35%] -mt-[15%] shadow-xl rounded-lg overflow-hidden bg-zinc-950/50 backdrop-blur-sm border border-white/10 p-1 mix-blend-multiply opacity-95" 
             )}>
                 <img
                   src={initialImageUrl}
                   alt="Design"
                   className="absolute inset-0 h-full w-full object-contain"
                   loading="eager"
                   decoding="async"
                 />
             </div>
         )}

         {view === 'back' && (
            <div
              className={cn(
                "relative z-10 rounded-md bg-black/0 overflow-hidden",
                isMug ? "h-[70%] w-[70%]" : "h-[58%] w-[42%] -mt-[6%]"
              )}
            >
              {isMug ? (
                <>
                  <img
                    src={backAbstractSvgDataUrl}
                    alt="Back abstract"
                    className="absolute inset-0 h-full w-full object-contain"
                    loading="eager"
                    decoding="async"
                  />
                  <img
                    src={backWordSvgDataUrl}
                    alt={`Back banner: ${bannerText}`}
                    className="absolute inset-0 h-full w-full object-contain"
                    loading="eager"
                    decoding="async"
                  />
                  {qrDataUrl ? (
                    <div className="absolute bottom-[14%] right-[14%] w-[28%] max-w-[170px] aspect-square rounded-2xl bg-[#ff1f5d]/95 border border-white/20 shadow-2xl overflow-hidden">
                      <img src={qrDataUrl} alt="QR code" className="h-full w-full object-contain p-2" loading="eager" decoding="async" />
                    </div>
                  ) : null}
                </>
              ) : (
                <img
                  src={backPreviewUrl}
                  alt="Back design"
                  className="absolute inset-0 h-full w-full object-contain"
                  loading="eager"
                  decoding="async"
                />
              )}
            </div>
         )}
         
      </div>

      {/* Controls */}
      <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold mb-2">Customize Your Gear</h1>
            <p className="text-zinc-400">Apply your generated artwork to premium products.</p>
        </div>

        <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-300">Select Product</label>
            <div className="grid grid-cols-2 gap-4">
                {products.map(p => (
                    <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setSelectedVariant(p.variants[0]); setSelectedColor(p.colors[0]); }}
                        className={cn(
                            "p-4 rounded-xl border text-left transition-all",
                            selectedProduct?.id === p.id 
                                ? "border-primary bg-primary/10 ring-1 ring-primary" 
                                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                        )}
                    >
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-sm text-zinc-400">${p.basePrice}</div>
                    </button>
                ))}
            </div>
        </div>
        
        {selectedProduct && (
            <div className="space-y-6">
                <div>
                    <label className="text-sm font-medium text-zinc-300 mb-3 block">Size / Variant</label>
                    <div className="flex flex-wrap gap-2">
                        {selectedProduct.variants.map(v => (
                            <button
                                key={v}
                                onClick={() => setSelectedVariant(v)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                                    selectedVariant === v
                                        ? "border-white bg-white text-black"
                                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-zinc-300 mb-3 block">Color</label>
                    <div className="flex flex-wrap gap-2">
                        {selectedProduct.colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setSelectedColor(c)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                                    selectedColor === c
                                        ? "border-white bg-white text-black"
                                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                                )}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        <div className="pt-6 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-6">
                <div className="text-zinc-400">Total</div>
                <div className="text-2xl font-bold">${selectedProduct?.basePrice.toFixed(2)}</div>
            </div>
            
            <button 
                onClick={handleAddToCart}
                disabled={orderStatus === 'processing' || orderStatus === 'success'}
                className={cn(
                    "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
                    orderStatus === 'success' 
                        ? "bg-green-500 text-white" 
                        : "bg-white text-black hover:bg-zinc-200"
                )}
            >
                {orderStatus === 'processing' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>}
                {orderStatus === 'success' ? 'Added to Cart!' : 'Add to Cart'}
                {orderStatus === 'idle' && <ShoppingCart className="w-5 h-5" />}
            </button>
            {orderStatus === 'success' && (
                <p className="text-green-500 text-center mt-2 text-sm font-medium">
                    Added to cart! You can view it in the Cart page.
                </p>
            )}
        </div>
      </div>
    </div>
    </div>
  );
}
