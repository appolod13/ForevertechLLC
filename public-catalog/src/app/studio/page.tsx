'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { DataDashboardButton } from '../../components/DataDashboardButton';
import { Sparkles } from 'lucide-react';

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioPageInner />
    </Suspense>
  );
}

function StudioPageInner() {
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMetadata, setGenerationMetadata] = useState<any>(null);

  const generateImage = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setGeneratedImage(''); // Clear old image completely

    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Generation failed');
      }

      let imageUrl = '';

      if (data.image_data_url) imageUrl = data.image_data_url;
      else if (data.image_base64) imageUrl = `data:image/png;base64,${data.image_base64}`;
      else if (data.imageUrl) imageUrl = data.imageUrl;
      else if (data.image_url) imageUrl = data.image_url;

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        setGenerationMetadata(data);
      } else {
        alert('No image data returned');
      }
    } catch (error: any) {
      alert(error.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-4xl font-bold mb-8">Creator Studio</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-3xl border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-purple-400 w-6 h-6" />
              <h2 className="text-2xl font-bold">AI Asset Generator</h2>
            </div>

            <textarea
              className="w-full bg-gray-900 border border-gray-600 rounded-2xl p-4 h-32 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe your quantum fractal..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <button
              onClick={generateImage}
              disabled={isGenerating || !prompt}
              className="w-full py-4 rounded-2xl font-bold text-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 transition-all active:scale-[0.985]"
            >
              {isGenerating ? 'Generating...' : 'Generate Asset & Content'}
            </button>

            {/* Latest Build Preview - Real Image Only */}
            <div className="mt-8 border-t border-gray-700 pt-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                    Latest Build Preview
                  </h3>
                  <p className="text-sm text-gray-400">Your most recent quantum-seeded fractal</p>
                </div>

                {generationMetadata?.fractal_dimension && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500 tracking-widest">FRACTAL DIMENSION</div>
                    <div className="font-mono text-4xl text-purple-400 font-bold tracking-tighter">
                      {generationMetadata.fractal_dimension.value}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative rounded-3xl overflow-hidden border border-gray-800 bg-black shadow-[0_0_80px_rgba(168,85,247,0.35)] aspect-video">
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Generated Fractal"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-center px-8">
                    Generate something to see your fractal here
                  </div>
                )}

                {isGenerating && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-purple-400 text-lg">Crafting your quantum fractal...</p>
                    </div>
                  </div>
                )}
              </div>

              {generatedImage && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href={`/customize?imageUrl=${encodeURIComponent(generatedImage)}`}
                    className="flex h-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-black active:scale-[0.985] transition-all"
                  >
                    Customize Your Gear →
                  </Link>

                  <button
                    onClick={() => prompt && generateImage()}
                    disabled={isGenerating}
                    className="flex h-14 items-center justify-center rounded-2xl border border-gray-700 text-base font-semibold active:scale-[0.985] transition-all disabled:opacity-60"
                  >
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-3xl border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Multi-Channel Poster</h2>
            <div className="text-center text-gray-400 py-12">
              Your posting tools will appear here
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}