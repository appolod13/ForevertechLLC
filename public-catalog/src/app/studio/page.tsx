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
  const [debugInfo, setDebugInfo] = useState('');

  const generateImage = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setGeneratedImage('');
    setDebugInfo('Starting generation...');

    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, quantum_mode: true }),
      });

      const data = await res.json();
      setDebugInfo(`Response received. Success: ${data.success}`);

      // Try every possible Base64 field
      let imageUrl = '';

      if (data.image_data_url) imageUrl = data.image_data_url;
      else if (data.image_base64) imageUrl = `data:image/png;base64,${data.image_base64}`;
      else if (data.imageUrl) imageUrl = data.imageUrl;
      else if (data.image_url) imageUrl = data.image_url;

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        setDebugInfo('Image URL set successfully! Length: ' + imageUrl.length);
      } else {
        setDebugInfo('No image URL found. Full response: ' + JSON.stringify(data).substring(0, 300));
      }
    } catch (error: any) {
      setDebugInfo('Error: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-6">Creator Studio - Debug Mode</h1>

      <textarea
        className="w-full bg-gray-800 border border-gray-600 rounded-xl p-4 h-24 mb-4"
        placeholder="Describe your fractal..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        onClick={generateImage}
        disabled={isGenerating || !prompt}
        className="w-full py-4 bg-purple-600 rounded-xl font-bold mb-6"
      >
        {isGenerating ? 'Generating...' : 'Generate Fractal'}
      </button>

      {/* Debug Info */}
      {debugInfo && (
        <div className="bg-black p-4 rounded-xl text-xs text-gray-300 mb-6 overflow-auto max-h-40">
          {debugInfo}
        </div>
      )}

      {/* Image Preview */}
      <div className="relative rounded-3xl overflow-hidden border border-gray-700 bg-black aspect-video">
        {generatedImage ? (
          <img 
            src={generatedImage} 
            alt="Generated Fractal" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Image will appear here
          </div>
        )}
      </div>

      {generatedImage && (
        <button
          onClick={() => {
            const link = document.createElement("a");
            link.href = generatedImage;
            link.download = "fractal.png";
            link.click();
          }}
          className="mt-4 w-full py-3 bg-green-600 rounded-xl font-bold"
        >
          Download Image
        </button>
      )}
    </div>
  );
}