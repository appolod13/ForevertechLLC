import { NextResponse } from 'next/server';

type Product = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  variants: string[];
  colors: string[];
  image: string;
  printifySkus: Record<string, string>;
  printType: 'standard' | 'all_over_print';
  surfaces: Array<'front' | 'back' | 'overview' | 'spin360' | 'finished'>;
  previewMode: 'flat' | 'aop';
  placementMode: 'single_front_with_back_optional' | 'all_over_print';
  templateProductId?: string;
  printifyPreviewUrl?: string;
};

const ORDERED_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

export async function GET() {
  const env = process.env as Record<string, string | undefined>;
  const defaultSku = env.PRINTIFY_DEFAULT_SKU;
  const aopDefaultSku = env.PRINTIFY_AOP_DEFAULT_SKU || env.PRINTIFY_AOP_SKU || defaultSku;
  const standardTemplateProductId = (env.PRINTIFY_TEMPLATE_PRODUCT_ID || '').trim() || undefined;
  const aopTemplateProductId = (env.PRINTIFY_AOP_TEMPLATE_PRODUCT_ID || '').trim() || undefined;
  const standardPreviewUrl = (env.PRINTIFY_TEE_PREVIEW_URL || '').trim() || undefined;
  const aopPreviewUrl = (env.PRINTIFY_AOP_PREVIEW_URL || '').trim() || undefined;

  const printifySkus: Record<string, string> = {};
  for (const size of ORDERED_SIZES) {
    const sku = env[`PRINTIFY_SKU_${size}`] || defaultSku;
    if (sku) {
      printifySkus[size] = sku;
    }
  }

  const variants = ORDERED_SIZES.filter(size => Boolean(printifySkus[size]));

  const aopPrintifySkus: Record<string, string> = {};
  for (const size of ORDERED_SIZES) {
    const sku = env[`PRINTIFY_AOP_SKU_${size}`] || aopDefaultSku;
    if (sku) {
      aopPrintifySkus[size] = sku;
    }
  }

  const aopVariants = ORDERED_SIZES.filter(size => Boolean(aopPrintifySkus[size]));

  const products: Product[] = [
    {
      id: 'tee',
      name: 'Premium Tee',
      description: 'Premium cotton tee printed on-demand.',
      basePrice: 59.99,
      currency: 'usd',
      variants,
      colors: ['Black', 'White'],
      image: '',
      printifySkus,
      printType: 'standard',
      surfaces: ['front', 'back', 'overview', 'spin360', 'finished'],
      previewMode: 'flat',
      placementMode: 'single_front_with_back_optional',
      templateProductId: standardTemplateProductId,
      printifyPreviewUrl: standardPreviewUrl,
    },
    {
      id: 'tee-aop',
      name: 'All-over-print Tee',
      description: 'Cut-and-sew premium tee with all-over-print coverage and an expanded wrap-style preview.',
      basePrice: 74.99,
      currency: 'usd',
      variants: aopVariants.length ? aopVariants : variants,
      colors: ['Black', 'Midnight'],
      image: '',
      printifySkus: aopVariants.length ? aopPrintifySkus : printifySkus,
      printType: 'all_over_print',
      surfaces: ['front', 'back', 'overview', 'spin360', 'finished'],
      previewMode: 'aop',
      placementMode: 'all_over_print',
      templateProductId: aopTemplateProductId,
      printifyPreviewUrl: aopPreviewUrl,
    },
  ];

  return NextResponse.json({ success: true, products });
}
