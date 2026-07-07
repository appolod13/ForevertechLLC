import { Shirt } from 'lucide-react';

import { cn } from '@/lib/utils';

export type MerchPreviewPrintType = 'standard' | 'all_over_print';

interface MerchPreviewPanelProps {
  imageUrl?: string | null;
  productName?: string | null;
  printType?: MerchPreviewPrintType | null;
  printifyPreviewUrl?: string | null;
  selectedVariant?: string | null;
  selectedColor?: string | null;
  className?: string;
}

export function MerchPreviewPanel({
  imageUrl,
  productName,
  printType = 'standard',
  printifyPreviewUrl,
  selectedVariant,
  selectedColor,
  className,
}: MerchPreviewPanelProps) {
  const isAopProduct = printType === 'all_over_print';
  const sampleUrl = typeof printifyPreviewUrl === 'string' ? printifyPreviewUrl.trim() : '';
  const normalizedProductName = typeof productName === 'string' && productName.trim() ? productName.trim() : 'Premium Tee';

  return (
    <div className={cn('relative z-10 w-full', className)}>
      <div className="grid w-full max-w-5xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Buyer Preview</div>
          <div className="mt-4 text-sm leading-6 text-zinc-400">
            See a closer finished-product sample before checkout, with the artwork framed like a real storefront mockup.
          </div>
          <div className="relative mt-8 flex min-h-[360px] items-center justify-center rounded-[24px] border border-white/5 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.24))]">
            <div className="absolute bottom-6 h-10 w-52 rounded-full bg-black/50 blur-2xl" />
            <div className="relative flex h-[92%] w-[82%] items-center justify-center">
              <Shirt
                strokeWidth={1}
                className={cn(
                  'drop-shadow-[0_35px_65px_rgba(0,0,0,0.6)]',
                  isAopProduct ? 'h-[112%] w-[112%] text-zinc-500' : 'h-[108%] w-[108%] text-zinc-500',
                )}
              />
              {imageUrl ? (
                <div
                  className={cn(
                    'absolute overflow-hidden rounded-[22px] border border-white/10 bg-zinc-950/65 shadow-[0_25px_60px_rgba(0,0,0,0.45)]',
                    isAopProduct ? 'h-[46%] w-[52%] -mt-[1%]' : 'h-[30%] w-[30%] -mt-[11%]',
                  )}
                >
                  <img
                    src={imageUrl}
                    alt="Finished product mockup"
                    className={cn('h-full w-full', isAopProduct ? 'object-cover' : 'object-contain p-2')}
                    loading="eager"
                    decoding="async"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/75 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Product Card</div>
            <div className="mt-3 text-2xl font-semibold text-white">{normalizedProductName}</div>
            <div className="mt-2 text-sm leading-6 text-zinc-400">
              {isAopProduct
                ? 'All-over-print mode wraps the generated artwork across a broader garment surface for a more complete final look.'
                : 'Standard mode keeps the design focused on the front and shows a cleaner production-ready tee presentation.'}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
              {selectedVariant ? <span className="rounded-full border border-zinc-700 bg-black/30 px-3 py-1">{selectedVariant}</span> : null}
              {selectedColor ? <span className="rounded-full border border-zinc-700 bg-black/30 px-3 py-1">{selectedColor}</span> : null}
              <span className="rounded-full border border-zinc-700 bg-black/30 px-3 py-1">{isAopProduct ? 'AOP Ready' : 'Front Print Ready'}</span>
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/75 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Printify Sample</div>
            {sampleUrl ? (
              <div className="mt-4 space-y-3">
                <a
                  href={sampleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-xl border border-white/10 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                >
                  Open Printify sample
                </a>
                <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/30 p-3">
                  <img src={sampleUrl} alt="Printify sample preview" className="h-full w-full rounded-xl object-cover" loading="eager" decoding="async" />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-700 bg-black/30 p-4 text-sm leading-6 text-zinc-400">
                Printify Sample
                <div className="mt-2">
                  No Printify sample image is linked yet. The finished product mockup above still shows the buyer what the shirt looks like before purchase.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
