'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { ProductCustomizer } from '@/components/ProductCustomizer';

function CustomizerContent() {
  const searchParams = useSearchParams();
  const imageUrl = searchParams.get('imageUrl');
  const prompt = searchParams.get('prompt');

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductCustomizer initialImageUrl={imageUrl} promptOverride={prompt} />
    </div>
  );
}

export default function CustomizePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
        <CustomizerContent />
      </Suspense>
    </div>
  );
}
