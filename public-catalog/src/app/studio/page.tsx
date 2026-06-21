'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { DataDashboardButton } from '../../components/DataDashboardButton';
import { FusionAI } from '../../components/FusionAI';
import { Send, Sparkles } from 'lucide-react';

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
  const [latestDropImageUrl, setLatestDropImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMetadata, setGenerationMetadata] = useState<any>(null);
  const [quantumMode, setQuantumMode] = useState(false);
  const [ipfsEnabled, setIpfsEnabled] = useState(false);

  const generateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGeneratedImage('');

    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          quantum_mode: quantumMode,
          ipfs_upload: ipfsEnabled,
          use_quantum_seed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');

      const imageUrl = data.image_url || data.imageUrl || data.data?.image_url || '';
      if (!imageUrl) throw new Error('No image returned');

      setGeneratedImage(imageUrl);
      setLatestDropImageUrl(imageUrl);

      setGenerationMetadata({
        fractal_dimension: data.fractal_dimension,
        quantum_provenance: data.quantum_provenance,
        quantumSeed: data.quantumSeed,
      });
    } catch (e: any) {
      alert(e.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Creator Studio</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Generator */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-purple-400" />
              <h2 className="text-2xl font-bold">AI Asset Generator</h2>
            </div>

            <textarea
              className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 h-32 mb-4 focus:ring-2 focus:ring-purple-500"
              placeholder="Describe your quantum fractal..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div className="flex gap-3 mb-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={quantumMode} onChange={(e) => setQuantumMode(e.target.checked)} />
                Quantum Mode
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={ipfsEnabled} onChange={(e) => setIpfsEnabled(e.target.checked)} />
                Public Link
              </label>
            </div>

            <button
              onClick={generateImage}
              disabled={isGenerating || !prompt}
              className="w-full py-4 rounded-2xl font-bold text-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 transition-all"
            >
              {isGenerating ? 'Generating...' : 'Generate Asset & Content'}
            </button>

            <FusionAI prompt={prompt} baseImageUrl={generatedImage} onImageGenerated={setGeneratedImage} />

            {/* === IMPROVED LATEST BUILD PREVIEW === */}
            <div className="mt-8 border-t border-gray-700 pt-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                    Latest Build Preview
                  </h3>
                  <p className="text-sm text-gray-400">Your most recent quantum-seeded fractal</p>
                </div>
                {generationMetadata?.fractal_dimension && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">FRACTAL DIMENSION</div>
                    <div className="text-3xl font-mono text-purple-400 font-bold">
                      {generationMetadata.fractal_dimension.value}
                    </div>
                  </div>
                )}
              </div>

              {/* Image Preview Card with Strong Glow */}
              <div className="relative group rounded-3xl overflow-hidden border border-gray-800 bg-black shadow-[0_0_70px_rgba(168,85,247,0.3)]">
                <div className="aspect-video relative bg-zinc-950">
                  {generatedImage ? (
                    <>
                      <img
                        src={generatedImage}
                        alt="Your Generated Fractal"
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.015]"
                      />
                      {/* Strong Neon Glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/25 via-transparent to-cyan-400/25 pointer-events-none" />
                      <div className="absolute inset-0 bg-[radial-gradient(#a855f715_1px,transparent_1px)] bg-[length:3px_3px] pointer-events-none" />

                      {generationMetadata?.quantum_provenance && (
                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs flex items-center gap-2 border border-cyan-500/40">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                          QUANTUM SEEDED
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                      <div className="text-6xl mb-4 opacity-30">✦</div>
                      <p className="text-gray-400 text-xl">Your fractal will appear here</p>
                    </div>
                  )}

                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-purple-400">Crafting your quantum fractal...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Bar with Download */}
                {generatedImage && (
                  <div className="bg-zinc-950/95 px-5 py-3 flex items-center justify-between text-sm border-t border-gray-800">
                    <div className="text-gray-200 truncate pr-4 font-medium">
                      {prompt || "Quantum Fractal"}
                    </div>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = generatedImage;
                        link.download = `quantum-fractal-${Date.now()}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-xl border border-gray-700 text-xs hover:bg-gray-900 transition"
                    >
                      ⬇ Download
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href={`/customize?imageUrl=${encodeURIComponent(latestDropImageUrl || generatedImage || '')}${prompt ? `&prompt=${encodeURIComponent(prompt)}` : ''}`}
                  className="flex h-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-black active:scale-[0.985] transition-all"
                >
                  Customize Your Gear →
                </Link>

                <button
                  onClick={() => prompt && generateImage()}
                  disabled={isGenerating || !prompt}
                  className="flex h-14 items-center justify-center rounded-2xl border border-gray-700 text-base font-semibold active:scale-[0.985] transition-all disabled:opacity-60"
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Send className="text-blue-400" /> Multi-Channel Poster
            </h2>
            <div className="text-center text-gray-400 py-12">
              Your Multi-Channel Poster content goes here
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}