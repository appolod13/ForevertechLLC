'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { DataDashboardButton } from '../../components/DataDashboardButton';
import { FusionAI } from '../../components/FusionAI';
import { Send, Sparkles } from 'lucide-react';
import styles from './page.module.css';

import { MIRROR_API_URL } from '@/lib/utils';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioPageInner />
    </Suspense>
  );
}

function StudioPageInner() {
  const searchParams = useSearchParams();
  const testMode = (searchParams?.get('test') || '') === '1';
  const scannedBackText = (searchParams?.get('back') || '').trim();
  const sharedImage = (searchParams?.get('shareImage') || '').trim();
  const sharedText = (searchParams?.get('shareText') || '').trim();
  const sharedPrompt = (searchParams?.get('sharePrompt') || '').trim();

  const [hydrated, setHydrated] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [crossOptimizeLoading, setCrossOptimizeLoading] = useState(false);
  const [crossOptimizeError, setCrossOptimizeError] = useState<string | null>(null);
  const [crossOptimizeReports, setCrossOptimizeReports] = useState<Array<{ model: string; role: string; output: string; error?: string }> | null>(null);
  const [generatedImage, setGeneratedImage] = useState('');
  const [latestDropImageUrl, setLatestDropImageUrl] = useState<string | null>(null);
  const [generatedTextContent, setGeneratedTextContent] = useState('');
  const [draftImage, setDraftImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationAttempt, setGenerationAttempt] = useState(0);

  // ✅ Updated type with fractal + quantum fields
  const [generationMetadata, setGenerationMetadata] = useState<{
    timestamp: string;
    model: string;
    params: Record<string, unknown>;
    fractal_dimension?: { value: number; method: string; label: string };
    quantum_provenance?: { provider: string; jobId: string; backend: string; seed: string; shots: number; createdAt: string };
    quantumSeed?: string;
  } | undefined>(undefined);

  const [catalogPosts, setCatalogPosts] = useState<Array<{ id: string; content: string }>>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>('');
  const [ipfsEnabled, setIpfsEnabled] = useState<boolean>(false);
  const [quantumMode, setQuantumMode] = useState<boolean>(false);
  const [postingStatus, setPostingStatus] = useState<string | null>(null);

  type SocialAccount = { authenticated: boolean; screenName?: string };
  const [socialAccounts, setSocialAccounts] = useState<Record<string, SocialAccount | null>>({
    twitter: null, telegram: null, instagram: null, tiktok: null, youtube: null
  });

  const [posterAttachedImage, setPosterAttachedImage] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rangeMode, setRangeMode] = useState<boolean>(false);
  const [lastGenTimestamp, setLastGenTimestamp] = useState<number>(Date.now());
  const [chatUser, setChatUser] = useState<string>('Guest');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatConnected, setChatConnected] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; time: string; user: string; text: string; assetUrl?: string }>>([]);

  const [pipelineStage, setPipelineStage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [generationMaxAttempts, setGenerationMaxAttempts] = useState<number>(10);
  const [logs, setLogs] = useState<{ time: string; msg: string; code?: string; type: 'info' | 'error' | 'warn' | 'success' }[]>([]);

  const addLog = (msg: string, type: 'info' | 'error' | 'warn' | 'success' = 'info', code?: string) => {
    const t = new Date();
    const time = t.toISOString().split('T')[1]?.slice(0, 8) || t.toISOString();
    setLogs((prev) => [...prev, { time, msg, type, code }]);
  };

  // ==================== buildDraftPreview ====================
  const buildDraftPreview = (text: string, w = 1024, h = 1024) => {
    try {
      if (typeof document === 'undefined') return '';
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      let seed = 0;
      for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0xffffffff;
      };

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#7FAAE6');
      grad.addColorStop(0.55, '#F1A487');
      grad.addColorStop(1, '#0b0b12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.ellipse(w * 0.32, h * 0.20, w * 0.42, h * 0.20, 0, 0, Math.PI * 2);
      ctx.fill();

      const horizon = Math.round(h * 0.52);
      ctx.fillStyle = 'rgba(40,36,52,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, horizon + h * 0.08);
      const peakX = Math.round(w * 0.42);
      const peakY = Math.round(horizon - h * 0.06);
      for (let x = 0; x <= w; x += Math.max(8, Math.floor(w / 140))) {
        const t = x / w;
        const wave = Math.sin(t * Math.PI * 1.3) * (h * 0.03);
        const jag = (rand() - 0.5) * (h * 0.04);
        const y = horizon + h * 0.05 + wave + jag;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(peakX, peakY);
      ctx.closePath();
      ctx.fill();

      const groundY = Math.round(h * 0.66);
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, groundY, w, h - groundY);

      let xPos = 0;
      while (xPos < w) {
        const bw = Math.floor(w * 0.012 + rand() * w * 0.02);
        const bh = Math.floor(h * 0.04 + rand() * h * 0.22);
        const shade = Math.floor(10 + rand() * 18);
        ctx.fillStyle = `rgb(${shade},${shade},${shade + 10})`;
        ctx.fillRect(xPos, groundY - bh, bw, h - (groundY - bh));
        xPos += bw + Math.floor(1 + rand() * 3);
      }

      const lightCount = Math.floor((w * h) / 380);
      for (let i = 0; i < lightCount; i++) {
        const px = Math.floor(rand() * w);
        const py = Math.floor(groundY + rand() * (h - groundY));
        const a = 0.35 + rand() * 0.55;
        const g = 150 + Math.floor(rand() * 70);
        const r = 220 + Math.floor(rand() * 35);
        const b = 45 + Math.floor(rand() * 55);
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fillRect(px, py, 1, 1);
      }

      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  };

  // ==================== generateImage ====================
  const generateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedImage('');
    setGeneratedTextContent('');
    setDraftImage(buildDraftPreview(prompt));
    setGenerationAttempt(0);
    setLogs([]);
    setProgress(0);
    setPipelineStage('Initializing...');
    setEtaSeconds(null);
    const start = Date.now();

    try {
      const endpoint = '/api/generate/image';
      const payload = {
        prompt,
        negative_prompt: "cartoon, anime, low poly, blurry, noisy, overexposed, washed out, flat lighting, distorted buildings, crooked horizons, text, watermark, logo, people, vehicles in close-up, messy composition, excessive neon everywhere, cyberpunk street scene",
        width: 1024,
        height: 1024,
        quantum_mode: quantumMode,
        ipfs_upload: ipfsEnabled,
        use_quantum_seed: true
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      let imageUrl = data.image_url || data.imageUrl || '';
      if (!imageUrl && data.data) imageUrl = data.data.image_url || data.data.imageUrl || '';

      if (!imageUrl) throw new Error('No image URL returned');

      setGeneratedImage(imageUrl);
      setLastGenTimestamp(Date.now());

      setGenerationMetadata({
        timestamp: new Date().toISOString(),
        model: quantumMode ? 'Quantum-v1' : 'Fusion Service',
        params: payload,
        fractal_dimension: data.fractal_dimension,
        quantum_provenance: data.quantum_provenance,
        quantumSeed: data.quantumSeed
      });

    } catch (e: any) {
      setGenerationError(e.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // ==================== RETURN ====================
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Creator Studio</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
          {/* Left Column */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-4 sm:p-6 lg:p-8 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="text-purple-400" />
                <h2 className="text-2xl font-bold">AI Asset Generator</h2>
              </div>
              <DataDashboardButton />
            </div>

            <textarea
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-4 h-32 focus:ring-2 focus:ring-purple-500 outline-none mb-4"
              placeholder="Describe the image..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <button
              onClick={generateImage}
              disabled={isGenerating || !prompt}
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 mb-6 ${isGenerating || !prompt ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500'}`}
            >
              {isGenerating ? 'Dreaming...' : 'Generate Asset & Content'}
            </button>

            <FusionAI prompt={prompt} baseImageUrl={generatedImage} onImageGenerated={(url) => setGeneratedImage(url)} />

            {/* === IMPROVED LATEST BUILD PREVIEW === */}
            <div className="mt-8 border-t border-gray-700 pt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400">
                    Latest Build Preview
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Your most recent quantum-seeded fractal</p>
                </div>

                {generationMetadata?.fractal_dimension && (
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 tracking-widest">FRACTAL DIMENSION</div>
                    <div className="font-mono text-2xl text-purple-400 font-semibold tracking-tighter">
                      {generationMetadata.fractal_dimension.value}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative group rounded-3xl overflow-hidden border border-gray-800 bg-black shadow-[0_0_60px_rgba(168,85,247,0.25)]">
                <div className="aspect-video relative bg-zinc-950">
                  {generatedImage ? (
                    <>
                      <img src={generatedImage} alt="Your Generated Fractal" className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.02]" />
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-cyan-400/20 pointer-events-none" />
                      <div className="absolute inset-0 bg-[radial-gradient(#a855f710_0.8px,transparent_1px)] bg-[length:3px_3px] pointer-events-none" />

                      {generationMetadata?.quantum_provenance && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/75 backdrop-blur px-3.5 py-1.5 border border-cyan-500/50 shadow-lg">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          <span className="text-cyan-400 text-xs font-semibold tracking-[1.5px]">QUANTUM SEEDED</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                      <div className="text-5xl mb-4 opacity-30">✦</div>
                      <p className="text-gray-400 text-lg">Your fractal will appear here</p>
                    </div>
                  )}

                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                        <p className="text-purple-400 font-medium">Crafting your quantum fractal...</p>
                      </div>
                    </div>
                  )}
                </div>

                {generatedImage && (
                  <div className="bg-zinc-950/95 px-5 py-3 flex items-center justify-between text-sm border-t border-gray-800">
                    <div className="text-gray-200 truncate pr-4 font-medium">{prompt || "Quantum Fractal"}</div>
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-[10px] text-gray-500 tracking-widest">
                        {generationMetadata?.quantumSeed?.slice(0, 8) || "—"}
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
                        className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1 text-xs font-medium hover:bg-gray-900 transition"
                      >
                        ⬇ Download
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href={`/customize?imageUrl=${encodeURIComponent(latestDropImageUrl || generatedImage || '')}${prompt ? `&prompt=${encodeURIComponent(prompt)}` : ''}`}
                  className="flex h-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-black transition-all hover:bg-zinc-100 active:scale-[0.985]"
                >
                  Customize Your Gear →
                </Link>

                <button
                  onClick={() => prompt && generateImage()}
                  disabled={isGenerating || !prompt}
                  className="flex h-14 items-center justify-center rounded-2xl border border-gray-700 text-base font-semibold transition-all hover:bg-gray-900 active:scale-[0.985] disabled:opacity-60"
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div id="multi-channel-poster" className="bg-gradient-to-b from-gray-800 to-gray-900 p-4 sm:p-6 lg:p-8 rounded-xl border border-gray-700">
            <div className="text-center text-gray-400 py-12">
              Multi-Channel Poster content goes here
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}