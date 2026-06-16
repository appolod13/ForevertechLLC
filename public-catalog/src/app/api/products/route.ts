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
};

const ORDERED_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

export async function GET() {
  const env = process.env as Record<string, string | undefined>;
  const defaultSku = env.PRINTIFY_DEFAULT_SKU;

  const printifySkus: Record<string, string> = {};
  for (const size of ORDERED_SIZES) {
    const sku = env[`PRINTIFY_SKU_${size}`] || defaultSku;
    if (sku) {
      printifySkus[size] = sku;
    }
  }

  const variants = ORDERED_SIZES.filter(size => Boolean(printifySkus[size]));

  const products: Product[] = [
    {
      id: 'tee',
      name: 'Premium Tee',
      description: 'Premium cotton tee printed on-demand.',
      basePrice: 60.00,
      currency: 'usd',
      variants,
      colors: ['Black', 'White'],
      image: '',
      printifySkus,
    },
  ];

  return NextResponse.json({ success: true, products });
}
