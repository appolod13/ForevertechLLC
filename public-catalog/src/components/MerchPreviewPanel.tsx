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
      <div className="grid w-full gap-4 lg:max-w-5xl lg:grid-cols-[1.15fr_0.85fr] lg:gap-5">
        <div className="relative overflow-hidden rounded-[24px] border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:rounded-[28px] sm:p-5 lg:p-6 lg:shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Buyer Preview</div>
          <div className="mt-3 text-sm leading-6 text-zinc-400 sm:mt-4">
            See a closer finished-product sample before checkout, with the artwork framed like a real storefront mockup.
          </div>
          <div
            data-testid="buyer-preview-stage"
            className="relative mt-5 flex min-h-[260px] items-center justify-center rounded-[20px] border border-white/5 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.24))] px-3 py-4 sm:mt-6 sm:min-h-[320px] sm:rounded-[24px] sm:px-4 sm:py-5 lg:mt-8 lg:min-h-[360px] lg:px-0 lg:py-0"
          >
            <div className="absolute bottom-6 h-10 w-52 rounded-full bg-black/50 blur-2xl" />
            <div className="relative flex h-full min-h-[220px] w-full max-w-[280px] items-center justify-center sm:max-w-[340px] lg:h-[92%] lg:w-[82%] lg:max-w-none">
              <Shirt
                strokeWidth={1}
                className={cn(
                  'drop-shadow-[0_35px_65px_rgba(0,0,0,0.6)]',
                  isAopProduct ? 'h-[102%] w-[102%] text-zinc-500 sm:h-[108%] sm:w-[108%] lg:h-[112%] lg:w-[112%]' : 'h-[96%] w-[96%] text-zinc-500 sm:h-[102%] sm:w-[102%] lg:h-[108%] lg:w-[108%]',
                )}
              />
              {imageUrl ? (
                <div
                  className={cn(
                    'absolute overflow-hidden rounded-[22px] border border-white/10 bg-zinc-950/65 shadow-[0_25px_60px_rgba(0,0,0,0.45)]',
                    isAopProduct ? 'h-[42%] w-[46%] -mt-[1%] sm:h-[44%] sm:w-[49%] lg:h-[46%] lg:w-[52%]' : 'h-[32%] w-[32%] -mt-[9%] sm:h-[31%] sm:w-[31%] sm:-mt-[10%] lg:h-[30%] lg:w-[30%] lg:-mt-[11%]',
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
          <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/75 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:rounded-[28px] sm:p-5">
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

          <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/75 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:rounded-[28px] sm:p-5">
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
