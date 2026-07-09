'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { Header } from '../../components/Header';
import { MultiPosterPanel } from '../../components/MultiPosterPanel';

export default function PosterPage() {
  return (
    <Suspense fallback={null}>
      <PosterPageInner />
    </Suspense>
  );
}

function PosterPageInner() {
  const searchParams = useSearchParams();
  const sharedImage = (searchParams?.get('shareImage') || '').trim();
  const sharedText = (searchParams?.get('shareText') || '').trim();
  const sharedPrompt = (searchParams?.get('sharePrompt') || '').trim();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold sm:text-4xl">MultiPoster</h1>
          <p className="mt-2 text-sm text-gray-400">
            Publish your latest generated image and caption without cluttering the Studio workflow.
          </p>
        </div>

        <MultiPosterPanel initialImageUrl={sharedImage} initialText={sharedText} initialPrompt={sharedPrompt} />
      </main>
    </div>
  );
}
