
'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import { Camera, RefreshCw, AlertCircle, Link as LinkIcon, Download } from 'lucide-react';
import Image from 'next/image';

interface Screenshot {
  filename: string;
  url: string;
  created: string;
  analysis?: {
    category?: string;
    tags?: string[];
    summary?: string;
  };
}

export default function GalleryPage() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch screenshots from the service
  const fetchScreenshots = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_SCREENSHOT_URL || 'http://localhost:4010';
      const res = await fetch(`${base}/api/screenshots`);
      if (!res.ok) throw new Error('Failed to fetch gallery');
      const data = await res.json();
      // Sort by newest first
      setScreenshots(data.sort((a: Screenshot, b: Screenshot) => new Date(b.created).getTime() - new Date(a.created).getTime()));
    } catch (e) {
      console.error(e);
      setError('Could not load gallery. Is the service running on port 4000?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
  }, []);

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    setCapturing(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setUrlInput('');
        await fetchScreenshots(); // Refresh list
      } else {
        setError(data.error || 'Capture failed');
      }
    } catch (e) {
      console.error(e);
      setError('Network error. Check service connection.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-7xl mx-auto p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Visual Asset Gallery</h1>
            <p className="text-gray-400">Manage scraped assets and automated screenshots.</p>
          </div>
          
          <button 
            onClick={fetchScreenshots}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg border border-gray-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Capture Tool */}
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mb-12 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Camera className="text-blue-400" />
            Capture New Asset
          </h2>
          <form onSubmit={handleCapture} className="flex gap-4">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
              <input 
                type="url" 
                placeholder="Enter URL (e.g., https://example.com)..."
                className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={capturing}
              className={`px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-all ${
                capturing 
                  ? 'bg-blue-900/50 text-blue-300 cursor-wait' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {capturing ? 'Capturing...' : 'Snap & Analyze'}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        {loading && screenshots.length === 0 ? (
          <div className="text-center py-20 text-gray-500">Loading assets...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {screenshots.map((shot) => (
              <div key={shot.filename} className="group bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-500 transition-all hover:shadow-xl hover:shadow-black/50">
                <div className="relative aspect-video bg-gray-900 overflow-hidden">
                  <Image 
                    src={`http://localhost:4000${shot.url}`} 
                    alt={shot.filename}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <a 
                      href={`http://localhost:4000${shot.url}`} 
                      download
                      className="self-end bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium truncate text-gray-200" title={shot.filename}>
                      {shot.filename.split('-').slice(1).join('-') || 'Screenshot'}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {new Date(shot.created).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* AI Tags Mockup - In a real scenario, these would come from the API */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-400 border border-gray-700">#web</span>
                    <span className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-400 border border-gray-700">#capture</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && screenshots.length === 0 && (
          <div className="text-center py-20 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
            <Camera className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400">No screenshots yet</h3>
            <p className="text-gray-500 mt-2">Enter a URL above to capture your first asset.</p>
          </div>
        )}
      </main>
    </div>
  );
}
