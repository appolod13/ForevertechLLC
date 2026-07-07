'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, Shirt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

type PreviewSurface = 'front' | 'back' | 'overview' | 'spin360';

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
  printType?: 'standard' | 'all_over_print';
  surfaces?: PreviewSurface[];
  previewMode?: 'flat' | 'aop';
  placementMode?: 'single_front_with_back_optional' | 'all_over_print';
  templateProductId?: string;
}

export function ProductCustomizer({ initialImageUrl, promptOverride }: { initialImageUrl: string | null; promptOverride?: string | null }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [view, setView] = useState<PreviewSurface>('front');
  const [spinAngle, setSpinAngle] = useState(0);
  const { addToCart } = useCart();

  const [includeQrStamp, setIncludeQrStamp] = useState(true);
  const [qrUrlInput, setQrUrlInput] = useState('');
  const [backImageDataUrl, setBackImageDataUrl] = useState<string>('');
  const [backImageError, setBackImageError] = useState<string | null>(null);

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
            {
              id: 'tee',
              name: 'Premium Tee',
              description: 'Premium cotton tee printed on-demand.',
              basePrice: 59.99,
              currency: 'usd',
              variants: ['S', 'M', 'L', 'XL'],
              colors: ['Black', 'White'],
              image: '',
              printType: 'standard' as const,
              surfaces: ['front', 'back', 'overview', 'spin360'] as PreviewSurface[],
              previewMode: 'flat' as const,
              placementMode: 'single_front_with_back_optional' as const,
            }
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

  const qrTargetUrl = useMemo(() => {
    const normalize = (input: string) => {
      const raw = String(input || '').trim();
      if (!raw) return '';
      const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
      try {
        const u = new URL(withScheme);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
        const href = u.toString();
        return href.length > 350 ? href.slice(0, 350) : href;
      } catch {
        return '';
      }
    };

    if (!includeQrStamp) return '';

    const custom = normalize(qrUrlInput);
    if (custom) return custom;

    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const u = new URL('/pixelqrypt', origin);
    u.searchParams.set('src', 'shirt');
    return u.toString();
  }, [includeQrStamp, qrUrlInput]);

  const qrUrlForOrder = useMemo(() => {
    if (!includeQrStamp) return '';
    const raw = String(qrUrlInput || '').trim();
    if (!raw) return '';
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
    try {
      const u = new URL(withScheme);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      const href = u.toString();
      return href.length > 350 ? href.slice(0, 350) : href;
    } catch {
      return '';
    }
  }, [includeQrStamp, qrUrlInput]);

  const setBackImageFromFile = async (file: File) => {
    setBackImageError(null);
    const maxBytes = 2_500_000;
    if (typeof file.size === 'number' && file.size > maxBytes) {
      setBackImageError(`Image too large (max ${Math.round(maxBytes / (1024 * 1024))}MB)`);
      setBackImageDataUrl('');
      return;
    }

    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('read_failed'));
      reader.readAsDataURL(file);
    });
    if (!rawDataUrl.startsWith('data:image/')) {
      setBackImageError('Only image files are allowed');
      setBackImageDataUrl('');
      return;
    }

    const resized = await new Promise<string>((resolve, reject) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const maxSide = 900;
          const iw = Math.max(1, img.naturalWidth || img.width || 1);
          const ih = Math.max(1, img.naturalHeight || img.height || 1);
          const scale = Math.min(1, maxSide / Math.max(iw, ih));
          const w = Math.max(1, Math.round(iw * scale));
          const h = Math.max(1, Math.round(ih * scale));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('canvas_unavailable'));
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL('image/jpeg', 0.88);
          resolve(out);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('image_load_failed'));
      img.src = rawDataUrl;
    });

    if (!resized.startsWith('data:image/')) {
      setBackImageError('Failed to process image');
      setBackImageDataUrl('');
      return;
    }
    if (resized.length > 1_500_000) {
      setBackImageError('Image is still too large after processing. Please use a smaller image.');
      setBackImageDataUrl('');
      return;
    }
    setBackImageDataUrl(resized);
    setView('back');
  };

  const sendToPoster = () => {
    if (typeof window === 'undefined') return;
    const img = typeof initialImageUrl === 'string' ? initialImageUrl.trim() : '';
    if (!img) return;
    const origin = window.location.origin;
    const sharePrompt = typeof resolvedPrompt === 'string' ? resolvedPrompt.trim() : '';
    const productLabel = `${selectedProduct?.name || 'Product'}${selectedVariant ? ` (${selectedVariant})` : ''}${selectedColor ? ` - ${selectedColor}` : ''}`.trim();
    const shareText = [
      `PixelQrypt: ${productLabel}`,
      sharePrompt ? sharePrompt.slice(0, 220) : '',
      `Shop: ${window.location.href}`,
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 900);
    const studioUrl = new URL('/studio', origin);
    studioUrl.searchParams.set('shareImage', img);
    studioUrl.searchParams.set('shareText', shareText);
    if (sharePrompt) studioUrl.searchParams.set('sharePrompt', sharePrompt.slice(0, 600));
    window.location.href = studioUrl.toString();
  };


  const backPreviewSeed = useMemo(() => {
    const raw = (backPatternSalt || bannerText || '').slice(0, 220);
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }, [backPatternSalt, bannerText]);

  const [customerBackTextDraft, setCustomerBackTextDraft] = useState('');
  const [customerBackText, setCustomerBackText] = useState('');

  const previewBackText = useMemo(() => {
    const draft = (customerBackTextDraft || '').trim();
    if (draft) return draft.slice(0, 64);
    const applied = (customerBackText || '').trim();
    return applied ? applied.slice(0, 64) : '';
  }, [customerBackText, customerBackTextDraft]);
  const backPreviewNonce = useMemo(
    () => `${backPreviewSeed}-${previewBackText}-${includeQrStamp ? 'qr-on' : 'qr-off'}`,
    [backPreviewSeed, includeQrStamp, previewBackText],
  );

  const backPreviewUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const u = new URL('/api/back-preview', origin);
    u.searchParams.set('text', bannerText || 'CUSTOM');
    u.searchParams.set('style', 'abstract');
    if (backPreviewSeed) u.searchParams.set('seed', backPreviewSeed);
    if (backPreviewNonce) u.searchParams.set('v', backPreviewNonce);
    if (previewBackText) u.searchParams.set('customerText', previewBackText);
    if (includeQrStamp) {
      if (qrTargetUrl) u.searchParams.set('qrUrl', qrTargetUrl);
    } else {
      u.searchParams.set('qrDisabled', '1');
    }
    return `${u.pathname}?${u.searchParams.toString()}`;
  }, [bannerText, backPreviewNonce, backPreviewSeed, includeQrStamp, previewBackText, qrTargetUrl]);

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
                printType: selectedProduct.printType || 'standard',
                placementMode: selectedProduct.placementMode || 'single_front_with_back_optional',
                templateProductId: selectedProduct.templateProductId || undefined,
                surfaces: selectedProduct.surfaces || ['front', 'back', 'overview', 'spin360'],
                previewMode: selectedProduct.previewMode || 'flat',
                backCustomerText: (previewBackText || '').trim(),
                backImageDataUrl: backImageDataUrl || undefined,
                qrUrl: qrUrlForOrder || undefined,
                qrDisabled: includeQrStamp ? undefined : true,
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

  const selectedSurfaces = selectedProduct?.surfaces || ['front', 'back', 'overview', 'spin360'];
  const isAopProduct = selectedProduct?.printType === 'all_over_print';
  const isBackView = view === 'back';
  const frontArtClass = isAopProduct
    ? "w-[58%] h-[58%] -mt-[3%] shadow-2xl rounded-2xl overflow-hidden bg-zinc-950/60 backdrop-blur-sm border border-white/10 p-2"
    : "w-[35%] h-[35%] -mt-[15%] shadow-xl rounded-lg overflow-hidden bg-zinc-950/50 backdrop-blur-sm border border-white/10 p-1 mix-blend-multiply opacity-95";
  const previewToneClass = isAopProduct ? 'from-zinc-900 via-black to-zinc-950' : 'from-zinc-900 via-zinc-950 to-black';
  const productSubtitle = isAopProduct
    ? 'Wrap your generated art across a cut-and-sew all-over-print silhouette with expanded preview coverage.'
    : 'Apply your generated artwork to a premium front-print tee with optional back personalization.';
  const surfaceLabels: Record<PreviewSurface, string> = {
    front: 'Front',
    back: 'Back',
    overview: 'Overview',
    spin360: '360 Preview',
  };

  return (
    <div className="space-y-8">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900/70"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Design Lab</div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-5xl">Customize Your Tee</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 lg:text-base">
              Switch between standard and all-over-print modes, preview the garment from multiple angles, and keep your generated artwork ready for checkout without touching the image generator.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Selected Product</div>
            <div className="mt-2 text-xl font-semibold text-white">{selectedProduct?.name || 'Premium Tee'}</div>
            <div className="mt-1 text-sm text-zinc-400">{productSubtitle}</div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
              <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1">{selectedVariant || 'S'}</span>
              <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1">{selectedColor || 'Black'}</span>
              <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1">
                {isAopProduct ? 'All-over-print' : 'Standard Tee'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
      {/* Preview Area */}
      <div className={cn("relative overflow-hidden rounded-[28px] border border-zinc-800 bg-gradient-to-br p-6", previewToneClass)}>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_38%)]" />
         <div className="relative z-20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-700 bg-black/50 p-1 backdrop-blur">
              {selectedSurfaces.map((surface) => (
                <button
                  key={surface}
                  type="button"
                  onClick={() => setView(surface)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                    view === surface ? 'bg-white text-black' : 'text-zinc-200 hover:bg-white/10'
                  )}
                >
                  {surfaceLabels[surface]}
                </button>
              ))}
            </div>
            <div className="rounded-full border border-zinc-700 bg-black/40 px-3 py-2 text-xs text-zinc-300">
              {isAopProduct ? 'AOP wrap preview' : 'Standard tee preview'}
            </div>
         </div>

         <div className="relative mt-6 aspect-square overflow-hidden rounded-[24px] border border-white/5 bg-black/25">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_52%)]" />

           {view === 'overview' ? (
             <div className="relative z-10 grid h-full grid-cols-1 gap-4 p-5 md:grid-cols-2">
               <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                 <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Front</div>
                 <div className="relative mt-4 flex h-[85%] items-center justify-center">
                   <Shirt strokeWidth={1} className="h-[88%] w-[88%] text-zinc-700" />
                   {initialImageUrl ? (
                     <div className={cn("absolute transition-all", isAopProduct ? "h-[46%] w-[46%] -mt-[1%]" : "h-[32%] w-[32%] -mt-[12%]")}>
                       <img src={initialImageUrl} alt="Overview front design" className="h-full w-full rounded-xl border border-white/10 bg-zinc-950/60 object-contain p-1 shadow-2xl" loading="eager" decoding="async" />
                     </div>
                   ) : null}
                 </div>
               </div>
               <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                 <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Back</div>
                 <div className="relative mt-4 flex h-[85%] items-center justify-center">
                   <Shirt strokeWidth={1} className="h-[88%] w-[88%] text-zinc-700" />
                   <div className={cn("absolute overflow-hidden rounded-xl", isAopProduct ? "h-[48%] w-[48%]" : "h-[40%] w-[32%] -mt-[1%]")}>
                     {isAopProduct && initialImageUrl ? (
                       <img src={initialImageUrl} alt="Overview back design" className="h-full w-full object-cover opacity-90" loading="eager" decoding="async" />
                     ) : (
                       <img src={backPreviewUrl} alt="Overview back preview" className="h-full w-full object-contain" loading="eager" decoding="async" />
                     )}
                   </div>
                 </div>
               </div>
             </div>
           ) : view === 'spin360' ? (
             <div className="relative z-10 flex h-full flex-col items-center justify-center p-6">
               <div
                 className="relative flex h-[78%] w-[78%] items-center justify-center transition-transform duration-300"
                 style={{ transform: `perspective(1100px) rotateX(10deg) rotateY(${spinAngle}deg)` }}
               >
                 <Shirt strokeWidth={1} className="h-full w-full text-zinc-700 drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]" />
                 {initialImageUrl ? (
                   <div
                     className={cn(
                       "absolute overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 shadow-2xl transition-all",
                       isAopProduct ? "h-[40%] w-[44%] -mt-[1%]" : "h-[28%] w-[28%] -mt-[11%]"
                     )}
                     style={{
                       transform: `translateZ(24px) scaleX(${Math.max(0.55, Math.cos((Math.abs(spinAngle) * Math.PI) / 180))})`,
                     }}
                   >
                     <img src={initialImageUrl} alt="360 shirt preview" className="h-full w-full object-cover" loading="eager" decoding="async" />
                   </div>
                 ) : null}
               </div>
               <div className="mt-4 w-full max-w-md rounded-2xl border border-zinc-800 bg-black/45 p-4">
                 <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                   <span>360 Preview</span>
                   <span>{spinAngle}°</span>
                 </div>
                 <input
                   type="range"
                   min="-180"
                   max="180"
                   step="5"
                   value={spinAngle}
                   onChange={(e) => setSpinAngle(Number(e.target.value))}
                   className="mt-3 w-full accent-white"
                 />
                 <div className="mt-2 text-xs text-zinc-400">Rotate the shirt to preview how the artwork feels across a 3D-style garment view.</div>
               </div>
             </div>
           ) : (
             <div className="relative flex h-full items-center justify-center">
               <div className={cn("absolute inset-0 flex items-center justify-center transition-opacity", isBackView ? "opacity-100" : "opacity-60")}>
                 <Shirt strokeWidth={1} className={cn("text-zinc-700", isAopProduct ? "w-[145%] h-[145%] min-w-[520px] min-h-[520px]" : "w-[140%] h-[140%] min-w-[500px] min-h-[500px] -mt-[5%]")} />
               </div>

               {view === 'front' && initialImageUrl ? (
                 <div className={cn("relative z-10 transition-all", frontArtClass)}>
                   <img
                     src={initialImageUrl}
                     alt="Design"
                     className={cn("absolute inset-0 h-full w-full", isAopProduct ? "object-cover" : "object-contain")}
                     loading="eager"
                     decoding="async"
                   />
                 </div>
               ) : null}

               {view === 'back' ? (
                 <div className={cn("relative z-10 overflow-hidden rounded-2xl", isAopProduct ? "h-[54%] w-[54%]" : "h-[58%] w-[42%] -mt-[6%]")}>
                   {isAopProduct && initialImageUrl ? (
                     <img
                       src={initialImageUrl}
                       alt="All-over-print back design"
                       className="absolute inset-0 h-full w-full object-cover opacity-95"
                       loading="eager"
                       decoding="async"
                     />
                   ) : (
                     <>
                       <img
                         src={backPreviewUrl}
                         alt="Back design"
                         className="absolute inset-0 h-full w-full object-contain"
                         loading="eager"
                         decoding="async"
                       />
                       {backImageDataUrl ? (
                         <img
                           src={backImageDataUrl}
                           alt="Back image"
                           className="absolute left-[10%] top-[14%] h-[58%] w-[70%] object-contain rounded-md shadow-xl border border-white/10 bg-black/20"
                           loading="eager"
                           decoding="async"
                         />
                       ) : null}
                     </>
                   )}
                 </div>
               ) : null}
             </div>
           )}
         </div>
      </div>

      {/* Controls */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Build Your Product</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Choose your shirt type, refine the preview, and prepare a cleaner production-ready order card for checkout.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
          <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-300">Select Product</label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProduct(p);
                    setSelectedVariant(p.variants[0]);
                    setSelectedColor(p.colors[0]);
                    setView('front');
                    setSpinAngle(0);
                  }}
                  className={cn(
                    "rounded-2xl border p-5 text-left transition-all",
                    selectedProduct?.id === p.id
                      ? "border-white/30 bg-white/[0.08] shadow-[0_20px_60px_rgba(255,255,255,0.06)]"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="mt-2 text-sm leading-6 text-zinc-400">{p.description}</div>
                    </div>
                    <div className="rounded-full border border-zinc-700 bg-black/40 px-3 py-1 text-xs text-zinc-300">
                      {p.printType === 'all_over_print' ? 'AOP' : 'Standard'}
                    </div>
                  </div>
                  <div className="mt-4 text-lg font-semibold text-white">${p.basePrice.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 mb-2 block">Back Text (optional)</label>
            <div className="flex gap-2">
              <input
                value={customerBackTextDraft}
                    onChange={(e) => setCustomerBackTextDraft(e.target.value.slice(0, 64))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                      const finalText = customerBackTextDraft.trim().slice(0, 64);
                      setCustomerBackText(finalText);
                      setCustomerBackTextDraft(finalText);
                  setView('back');
                }}
                placeholder="Type the text you want at the top of the back"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-white/15"
              />
              <button
                type="button"
                onClick={() => {
                      const finalText = customerBackTextDraft.trim().slice(0, 64);
                      setCustomerBackText(finalText);
                      setCustomerBackTextDraft(finalText);
                  setView('back');
                }}
                className="shrink-0 rounded-xl border border-zinc-800 bg-white px-4 py-3 text-sm font-bold text-black hover:bg-zinc-200"
              >
                Done
              </button>
            </div>
            <div className="mt-2 text-xs text-zinc-500">{customerBackTextDraft.length}/64</div>
          </div>
        </div>
        
        {selectedProduct && (
            <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Back Image (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setBackImageFromFile(f);
                        e.currentTarget.value = '';
                      }}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                      <div>Upload an image to place inside the red back panel.</div>
                      {backImageDataUrl ? (
                        <button
                          type="button"
                          onClick={() => { setBackImageDataUrl(''); setBackImageError(null); }}
                          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200 hover:bg-zinc-800"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    {backImageError ? <div className="text-xs text-red-400">{backImageError}</div> : null}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-zinc-300">Preview Notes</div>
                    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm leading-6 text-zinc-400">
                      {isAopProduct
                        ? 'All-over-print mode expands the artwork across a wider garment area and gives you a stronger 360 preview feel. Keep the original art centered for the cleanest wrap effect.'
                        : 'Standard mode keeps the front artwork focused and lets you personalize the back with text, an extra image, and a QR link.'}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-zinc-300">QR Link (optional)</label>
                    <label className="flex items-center gap-2 text-xs text-zinc-400">
                      <input
                        type="checkbox"
                        checked={includeQrStamp}
                        onChange={(e) => setIncludeQrStamp(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
                      />
                      Include QR stamp
                    </label>
                  </div>
                  <input
                    type="text"
                    value={qrUrlInput}
                    onChange={(e) => setQrUrlInput(e.target.value)}
                    placeholder="https://yourbusiness.com"
                    disabled={!includeQrStamp}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                  />
                  <div className="space-y-1 text-[11px] text-zinc-500">
                    <div className="font-mono">https://yourbusiness.com</div>
                    <div>This link will be encoded into the QR stamp on the back.</div>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
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
            </div>
        )}

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
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
            <button
              type="button"
              onClick={sendToPoster}
              disabled={!initialImageUrl}
              className={cn(
                "mt-3 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border",
                initialImageUrl ? "border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800" : "border-zinc-900 bg-zinc-950/40 text-zinc-600 cursor-not-allowed"
              )}
            >
              Send to Multi-Channel Poster
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
