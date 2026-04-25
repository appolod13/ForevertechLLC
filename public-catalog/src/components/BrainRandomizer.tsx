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
      const res = await fetch('/api/brain/roulette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_path: dataset, steps: 20 })
      });
      
      if (!res.ok) {
        throw new Error('Failed to generate from brain randomizer');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      // Save to Gallery
      try {
        const storedUserStr = localStorage.getItem('user');
        const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
        const userName = storedUser?.name || storedUser?.email || 'Anonymous Artist';
        const catalogName = `${userName.split(' ')[0]}'s Catalog`;
        
        // Convert blob to base64 for persistent gallery viewing
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result;
          fetch('/api/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: base64data,
              prompt: `Randomized from ${dataset}`,
              userName,
              catalogName
            })
          }).catch(err => console.error('Failed to save to gallery', err));
        };
      } catch (err) {
        console.error('Failed to setup gallery save', err);
      }

      onImageGenerated(url);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred');
      }
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
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Blending & Generating...</span>
                </div>
                <span className="text-[10px] text-green-200 mt-1 font-normal opacity-80">(This uses heavy AI models and may take up to 5-10 minutes on CPU)</span>
              </div>
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