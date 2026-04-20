import React, { useState } from 'react';
import { Sparkles, Loader2, Database } from 'lucide-react';

export default function BrainRandomizer({ onImageGenerated }: { onImageGenerated: (url: string) => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataset, setDataset] = useState('/Users/Administrator/Datasets/utopian_clean_city/images2');
  const [error, setError] = useState<string | null>(null);

  const randomize = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/brain/roulette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_path: dataset, steps: 20 })
      });
      
      if (!res.ok) {
        throw new Error('Failed to generate from brain randomizer');
      }

      const imageUrlPath = res.headers.get('X-Image-Url');
      if (imageUrlPath) {
        onImageGenerated(`http://localhost:8000${imageUrlPath}`);
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        onImageGenerated(url);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="p-6 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-600/20 rounded-lg">
            <Database className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Brain Randomizer (Train the Brain)</h3>
            <p className="text-xs text-gray-400">Blend and randomize images from a dataset</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2 font-semibold">Training Dataset Option</label>
            <select 
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
            >
              <option value="/Users/Administrator/Datasets/utopian_clean_city/images">Default Theme (Utopian Clean City)</option>
              <option value="/Users/Administrator/Datasets/utopian_clean_city/images2">Dominican Type (Images2 Blend)</option>
            </select>
          </div>

          <button
            onClick={randomize}
            disabled={isGenerating}
            className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Blending & Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Blend Dataset & Generate Random
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}