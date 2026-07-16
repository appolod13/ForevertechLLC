'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { DataDashboardButton } from '../../components/DataDashboardButton';
import { FusionAI } from '../../components/FusionAI';
import { LatestAIImage } from '../../components/LatestAIImage';
import { MerchPreviewPanel } from '../../components/MerchPreviewPanel';
import { Send, Sparkles } from 'lucide-react';
import styles from './page.module.css';

import { MIRROR_API_URL } from '@/lib/utils';
import { buildQuantumSourceLinks, getCreatorAccess } from '@/lib/creatorAccess';
import {
  saveStoredGeneration,
  upsertSourceRecord,
  type SourceRecordLike,
  type StoredGenerationRecord,
} from '@/lib/creatorArtifacts';

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
  const [generationMetadata, setGenerationMetadata] = useState<{
    timestamp: string;
    model: string;
    params: Record<string, unknown>;
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
  const [quantumUnlocked, setQuantumUnlocked] = useState<boolean>(false);
  const [postingStatus, setPostingStatus] = useState<string | null>(null);
  const [quantumRecord, setQuantumRecord] = useState<{
    id: string;
    createdAt: string;
    prompt: string;
    imageUrl: string;
    model: string;
    metadata: Record<string, unknown>;
  } | null>(null);
  
  type SocialAccount = { authenticated: boolean; screenName?: string };
  const [socialAccounts, setSocialAccounts] = useState<Record<string, SocialAccount | null>>({
    twitter: null,
    telegram: null,
    instagram: null,
    tiktok: null,
    youtube: null,
    reddit: null,
    discord: null,
    rss: null,
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
  const [logs, setLogs] = useState<
    { time: string; msg: string; code?: string; type: 'info' | 'error' | 'warn' | 'success' }[]
  >([]);

  const addLog = (msg: string, type: 'info' | 'error' | 'warn' | 'success' = 'info', code?: string) => {
    const t = new Date();
    const time = t.toISOString().split('T')[1]?.slice(0, 8) || t.toISOString();
    setLogs((prev) => [...prev, { time, msg, type, code }]);
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!scannedBackText) return;
    setGeneratedTextContent(scannedBackText);
    setPostContent((prev) => (prev && prev.trim() ? prev : scannedBackText));
    addLog(`Scanned back text: ${scannedBackText}`, 'success', 'qr_scan');
  }, [hydrated, scannedBackText]);

  useEffect(() => {
    if (!hydrated) return;
    if (!sharedImage && !sharedText && !sharedPrompt) return;
    if (sharedImage) {
      setPosterAttachedImage((prev) => prev || sharedImage);
      setGeneratedImage((prev) => prev || sharedImage);
    }
    if (sharedText) {
      setPostContent((prev) => (prev && prev.trim() ? prev : sharedText));
    }
    if (sharedPrompt) {
      setPrompt((prev) => (prev && prev.trim() ? prev : sharedPrompt));
    }
    addLog('Imported item into Multi-Channel Poster', 'success', 'share_in');
  }, [hydrated, sharedImage, sharedPrompt, sharedText]);

  useEffect(() => {
    setHydrated(true);
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => setSocialAccounts(data))
      .catch(() => setSocialAccounts({
        twitter: { authenticated: false },
        telegram: { authenticated: false },
        instagram: { authenticated: false },
        tiktok: { authenticated: false },
        youtube: { authenticated: false },
        reddit: { authenticated: false },
        discord: { authenticated: false },
        rss: { authenticated: false },
      }));
  }, []);

  useEffect(() => {
    let isMounted = true;
    let es: EventSource | null = null;

    const bootstrap = async () => {
      try {
        const res = await fetch('/api/chat/history', { cache: 'no-store' });
        const json = await res.json();
        if (isMounted && json?.success && Array.isArray(json.data?.messages)) {
          setChatMessages(json.data.messages);
        }
      } catch {
      }

      try {
        es = new EventSource('/api/chat/stream');
        es.addEventListener('open', () => {
          if (isMounted) setChatConnected(true);
        });
        es.addEventListener('error', () => {
          if (isMounted) setChatConnected(false);
        });
        es.addEventListener('history', (evt) => {
          try {
            const parsed = JSON.parse((evt as MessageEvent).data);
            if (isMounted && parsed && Array.isArray(parsed.messages)) setChatMessages(parsed.messages);
          } catch {
          }
        });
        es.addEventListener('message', (evt) => {
          try {
            const msg = JSON.parse((evt as MessageEvent).data);
            if (!isMounted || !msg) return;
            setChatMessages((prev) => [...prev, msg].slice(-200));
          } catch {
          }
        });
      } catch {
        if (isMounted) setChatConnected(false);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
      if (es) es.close();
    };
  }, []);

  const sendChat = async (assetUrl?: string) => {
    const text = chatInput.trim();
    if (!text && !assetUrl) return;
    setChatInput('');
    try {
      await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user: chatUser || 'Guest', text, assetUrl }),
      });
    } catch {
    }
  };

  const chatPreview = useMemo(() => chatMessages.slice(-50), [chatMessages]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('foreverteck.studio.lastImage');
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return;
      const rec = parsed as { imageUrl?: unknown; meta?: unknown; prompt?: unknown; quantumMode?: unknown };
      if (typeof rec.imageUrl === 'string' && rec.imageUrl.trim()) {
        setGeneratedImage(rec.imageUrl);
      }
      if (typeof rec.prompt === 'string') {
        const restored = rec.prompt.trim();
        const legacyPrefix = 'cinematic wide establishing shot of a vast futuristic megacity';
        if (restored && !restored.toLowerCase().startsWith(legacyPrefix)) setPrompt(restored);
      }
      if (typeof rec.quantumMode === 'boolean') {
        setQuantumMode(rec.quantumMode);
      }
      if (rec.meta && typeof rec.meta === 'object' && typeof rec.imageUrl === 'string' && typeof rec.prompt === 'string' && rec.quantumMode === true) {
        setQuantumRecord({
          id: String((rec.meta as Record<string, unknown>).requestId || (rec.meta as Record<string, unknown>).seed || `record-${Date.now()}`),
          createdAt: new Date().toISOString(),
          prompt: rec.prompt,
          imageUrl: rec.imageUrl,
          model: 'Quantum-v1 (Wolfram+Qiskit)',
          metadata: rec.meta as Record<string, unknown>,
        });
      }
      if (rec.meta && typeof rec.meta === 'object') {
        setGenerationMetadata({
          timestamp: new Date().toISOString(),
          model: 'Restored',
          params: rec.meta as Record<string, unknown>,
        });
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!quantumMode && quantumUnlocked) {
      setQuantumUnlocked(false);
    }
  }, [quantumMode, quantumUnlocked]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch(`${MIRROR_API_URL}/api/catalog/posts`, { cache: 'no-store' });
        const data: unknown = await res.json();
        const d = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {};
        const items = Array.isArray(d.posts) ? d.posts : [];
        setCatalogPosts(items.map((p) => {
          const rec = (typeof p === 'object' && p !== null) ? (p as Record<string, unknown>) : {};
          return { id: String(rec.id ?? Math.random()), content: String(rec.content ?? '') };
        }));
      } catch {
        try {
          const res = await fetch('/api/catalog/posts', { cache: 'no-store' });
          const data: unknown = await res.json();
          const d = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {};
          const items = Array.isArray(d.posts) ? d.posts : [];
          setCatalogPosts(items.map((p) => {
            const rec = (typeof p === 'object' && p !== null) ? (p as Record<string, unknown>) : {};
            return { id: String(rec.id ?? Math.random()), content: String(rec.content ?? '') };
          }));
        } catch {
          setCatalogPosts([]);
        }
      }
    };
    fetchCatalog();
  }, []);

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

      let x = 0;
      while (x < w) {
        const bw = Math.floor(w * 0.012 + rand() * w * 0.02);
        const bh = Math.floor(h * 0.04 + rand() * h * 0.22);
        const shade = Math.floor(10 + rand() * 18);
        ctx.fillStyle = `rgb(${shade},${shade},${shade + 10})`;
        ctx.fillRect(x, groundY - bh, bw, h - (groundY - bh));
        x += bw + Math.floor(1 + rand() * 3);
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
        if (rand() < 0.15) ctx.fillRect(Math.min(w - 1, px + 1), py, 1, 1);
      }

      const clusterLeft = Math.round(w * 0.70);
      const rightEdge = Math.round(w * 0.97);
      const towerCount = 4 + Math.floor(rand() * 3);
      for (let i = 0; i < towerCount; i++) {
        const tw = Math.floor(w * 0.035 + rand() * w * 0.03);
        const th = Math.floor(h * 0.38 + rand() * h * 0.28);
        const tx = Math.floor(clusterLeft + rand() * Math.max(1, rightEdge - clusterLeft - tw));
        const ty = groundY - th;
        ctx.fillStyle = 'rgba(22,26,38,0.98)';
        ctx.fillRect(tx, ty, tw, th + Math.floor(rand() * h * 0.03));
        const seams = 2 + Math.floor(rand() * 3);
        for (let s = 0; s < seams; s++) {
          const sx = tx + Math.floor(((s + 1) * tw) / (seams + 1));
          ctx.fillStyle = 'rgba(70,210,255,0.70)';
          ctx.fillRect(sx, ty + Math.floor(th * 0.08), Math.max(2, Math.floor(tw / 18)), th);
        }
      }

      ctx.fillStyle = 'rgba(255,200,170,0.10)';
      ctx.fillRect(0, horizon - Math.floor(h * 0.02), w, Math.floor(h * 0.20));

      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  };

  const crossOptimizePrompt = async () => {
    if (!prompt || crossOptimizeLoading) return;
    setCrossOptimizeLoading(true);
    setCrossOptimizeError(null);
    setCrossOptimizeReports(null);
    try {
      const res = await fetch('/api/agents/cross-optimize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          goals: ['maximize realism', 'clear composition', 'avoid watermarks/text'],
          includeOpenClaw: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setCrossOptimizeError(String(json?.error || 'cross_optimize_failed'));
        return;
      }
      const optimized = String(json.data.optimizedPrompt || '').trim();
      if (optimized) setPrompt(optimized);
      const reports = Array.isArray(json.data.reports) ? json.data.reports : null;
      setCrossOptimizeReports(reports);
    } catch (e) {
      setCrossOptimizeError(e instanceof Error ? e.message : 'cross_optimize_failed');
    } finally {
      setCrossOptimizeLoading(false);
    }
  };

  const generationMode = quantumMode ? 'real_quantum' : 'standard';

  const generationButtonLabel = (() => {
    if (isGenerating) return 'Dreaming...';
    if (generationMode === 'real_quantum') {
      return quantumUnlocked ? 'Generate with Real Quantum Computer' : 'Unlock Real Quantum Generation - $9.99';
    }
    return 'Generate Standard Asset & Content';
  })();

  const handleGenerationAction = async () => {
    if (!prompt || isGenerating) return;
    if (generationMode === 'real_quantum' && !quantumUnlocked) {
      setQuantumUnlocked(true);
      setGenerationError(null);
      addLog('Real quantum generation unlocked for this prompt.', 'success', 'I_Q_UNLOCKED');
      return;
    }
    await generateImage();
  };

  const quantumRecordText = useMemo(() => {
    if (!quantumRecord) return '';
    return [
      'PixelQrypt Verified Origin Record',
      `Record ID: ${quantumRecord.id}`,
      `Created: ${quantumRecord.createdAt}`,
      `Mode: Real Quantum Generation`,
      `Model: ${quantumRecord.model}`,
      `Prompt: ${quantumRecord.prompt}`,
      `Image: ${quantumRecord.imageUrl}`,
      '',
      'Metadata',
      JSON.stringify(quantumRecord.metadata, null, 2),
      '',
      'First Wave Note',
      'Your seed is now part of the first generation of quantum-verified art records.',
    ].join('\n');
  }, [quantumRecord]);

  const quantumRecordUrl = useMemo(() => {
    if (!quantumRecordText) return '';
    return `data:text/plain;charset=utf-8,${encodeURIComponent(quantumRecordText)}`;
  }, [quantumRecordText]);

  const quantumSourceLinks = useMemo(() => {
    if (!quantumRecord) return null;
    return buildQuantumSourceLinks({
      id: quantumRecord.id,
      metadata: quantumRecord.metadata,
    });
  }, [quantumRecord]);

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
        ipfs_upload: ipfsEnabled
      };

      const maxAttempts = testMode
        ? 3
        : Math.min(10, Math.max(5, Number(process.env.NEXT_PUBLIC_AI_GEN_MAX_RETRIES || 10)));
      setGenerationMaxAttempts(maxAttempts);
      let attempt = 0;
      let successData: Record<string, unknown> | null = null;

      while (attempt < maxAttempts) {
        attempt++;
        setGenerationAttempt(attempt);
        addLog(`Attempt ${attempt}/${maxAttempts} started`, 'info', 'I_ATTEMPT_START');
        setPipelineStage('Prompt validation');
        setProgress(8);

        const attemptStartedAt = Date.now();
        let tick: ReturnType<typeof setInterval> | null = null;

        try {
          setPipelineStage(quantumMode ? 'Quantum processing' : 'Rendering image');

          tick = setInterval(() => {
            const elapsedMs = Date.now() - attemptStartedAt;
            // Provide a visual progress indicator that slows down but never quite reaches 100%
            const maxExpectedMs = quantumMode ? 120_000 : 60_000;
            const ratio = Math.min(0.99, elapsedMs / maxExpectedMs);
            const base = 10;
            const cap = ipfsEnabled ? 88 : 94;
            const nextProgress = Math.min(cap, Math.round(base + ratio * (cap - base)));
            setProgress((p) => Math.max(p, nextProgress));
            const remainingMs = Math.max(0, maxExpectedMs - elapsedMs);
            setEtaSeconds(Math.ceil(remainingMs / 1000));
          }, 750);

          const res = await fetch(endpoint, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(payload)
          });
          
          if (tick) clearInterval(tick);

          const raw: unknown = await res.json().catch(() => null);
          const data = (typeof raw === 'object' && raw !== null) ? (raw as Record<string, unknown>) : {};

          if (res.status === 429) {
            addLog('Server rate limit hit', 'warn', 'E_RATE_LIMIT');
            throw new Error('rate_limited');
          }
          if (!res.ok || data.success !== true) {
            const details = (typeof data.details === 'object' && data.details !== null) ? (data.details as Record<string, unknown>) : null;
            const errCode = details && typeof details.code === 'string' ? details.code : undefined;
            const errMsg = details && typeof details.message === 'string'
              ? details.message
              : typeof data.error === 'string'
                ? data.error
                : `http_${res.status}`;
            addLog(errMsg, 'error', errCode || 'E_API_FAILURE');
            throw new Error(errMsg);
          }

          successData = data;
          if (ipfsEnabled) {
            setPipelineStage('Link upload');
            setProgress(92);
          }
          setEtaSeconds(0);
          setProgress(100);
          setPipelineStage('Complete');
          addLog(`Generation successful on attempt ${attempt}`, 'success', 'I_SUCCESS');
          break;

        } catch (err: unknown) {
          if (tick) clearInterval(tick);
          const errMsg =
            (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string')
              ? (err as { message: string }).message
              : (err instanceof Error ? err.message : 'unknown_error');
          addLog(`Attempt ${attempt} failed: ${errMsg}`, 'error', 'E_ATTEMPT_FAILED');

          if (attempt >= maxAttempts) {
            throw new Error(`Max retries reached. Last error: ${errMsg}`);
          }

          const backoffMs = testMode ? 200 : Math.min(60_000, Math.pow(2, attempt - 1) * 1000);
          const backoffSeconds = Math.ceil(backoffMs / 1000);
          setPipelineStage('Retry backoff');
          addLog(`Retrying in ${backoffSeconds}s`, 'warn', 'I_BACKOFF');

          const waitStart = Date.now();
          let waitTick: ReturnType<typeof setInterval> | null = null;
          waitTick = setInterval(() => {
            const elapsed = Date.now() - waitStart;
            const remaining = Math.max(0, backoffMs - elapsed);
            setEtaSeconds(Math.ceil(remaining / 1000));
            setProgress((p) => Math.max(5, Math.min(25, p)));
          }, 300);
          await new Promise((r) => setTimeout(r, backoffMs));
          if (waitTick) clearInterval(waitTick);
        }
      }

      if (!successData) {
          throw new Error("Generation failed after all retries.");
      }

      let imageUrl = '';
            if (typeof successData.image_url === 'string') imageUrl = successData.image_url;
            else if (typeof successData.imageUrl === 'string') imageUrl = successData.imageUrl;
            else if (typeof successData.data === 'object' && successData.data !== null) {
              const d = successData.data as Record<string, unknown>;
              if (typeof d.image_url === 'string') imageUrl = d.image_url;
              else if (typeof d.imageUrl === 'string') imageUrl = d.imageUrl;
            }

            // Additional check for fallback structure that might be deeply nested or wrapped
            if (!imageUrl && successData.data && (successData.data as { data?: { image_url?: string; imageUrl?: string } }).data) {
              const dd = (successData.data as { data: { image_url?: string; imageUrl?: string } }).data;
              if (typeof dd.image_url === 'string') imageUrl = dd.image_url;
              else if (typeof dd.imageUrl === 'string') imageUrl = dd.imageUrl;
            }

            // Fallback for mock generation or when structure is completely different
            if (!imageUrl && typeof successData === 'object' && successData !== null) {
              const obj = successData as Record<string, unknown>;
              if (obj.items && Array.isArray(obj.items) && obj.items.length > 0) {
                 imageUrl = obj.items[0].image_url || obj.items[0].imageUrl;
              }
            }

            if (!imageUrl) {
              console.error("Failed to parse image URL from response:", successData);
              throw new Error('Generation succeeded but returned no image URL');
            }

      const successRec = isRecord(successData) ? (successData as Record<string, unknown>) : {};
      const dataObjTmp = isRecord(successRec['data']) ? (successRec['data'] as Record<string, unknown>) : null;
      const metaObjTmp =
        isRecord(successRec['meta'])
          ? (successRec['meta'] as Record<string, unknown>)
          : dataObjTmp && isRecord(dataObjTmp['meta'])
            ? (dataObjTmp['meta'] as Record<string, unknown>)
            : {};

      const ipfsGatewayVal = metaObjTmp['ipfs_gateway'];
      const ipfsUrlVal = metaObjTmp['ipfs_url'];
      const ipfsGatewayRaw =
        typeof ipfsGatewayVal === 'string' && ipfsGatewayVal.trim()
          ? ipfsGatewayVal.trim()
          : typeof ipfsUrlVal === 'string' && ipfsUrlVal.startsWith('ipfs://')
            ? ipfsUrlVal.replace('ipfs://', 'https://ipfs.io/ipfs/')
            : '';

      if (ipfsEnabled && ipfsGatewayRaw && (ipfsGatewayRaw.startsWith('http://') || ipfsGatewayRaw.startsWith('https://'))) {
        imageUrl = ipfsGatewayRaw;
      }

      setGeneratedImage(imageUrl);
      setDraftImage('');
      
      // Generate associated content automatically
      try {
        setPipelineStage('Generating Post Content...');
        setProgress(95);
        const cfRes = await fetch('/api/content-factory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: prompt,
            platforms: ['twitter'],
            imageProvider: 'mock',
            safetyEnabled: true,
            autoSocialEnabled: true,
            mode: 'full',
          }),
        });
        const cfData = await cfRes.json();
        if (cfData.success && cfData.items && cfData.items.length > 0) {
          setGeneratedTextContent(cfData.items[0].text_content);
          addLog('Post content generated successfully. Ready to be sent to Multi-Channel Poster.', 'success', 'I_CF_SUCCESS');
          setPipelineStage('Complete');
          setProgress(100);
        }
      } catch (err) {
        console.error('Failed to auto-generate content', err);
        addLog('Failed to auto-generate content', 'warn', 'E_CF_FAILED');
        setPipelineStage('Complete');
        setProgress(100);
      }
      
      // Save to Gallery
      try {
        const storedUserStr = localStorage.getItem('user');
        const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
        const userName = storedUser?.name || storedUser?.email || 'Anonymous Artist';
        const userId = storedUser?.id || 'anonymous';
        const catalogName = `${userName.split(' ')[0]}'s Catalog`;
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
          deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem('device_id', deviceId);
        }
        
        const payload = {
          imageUrl,
          prompt,
          userName,
          catalogName,
          userId,
          deviceId,
        };

        const cacheKey = 'ft.gallery.cache';

        const res = await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json().catch(() => null);
        const itemFromServer = json && json.success && json.item ? json.item : null;

        try {
          const existingRaw = localStorage.getItem(cacheKey);
          const existing = existingRaw ? JSON.parse(existingRaw) : [];
          const next = Array.isArray(existing) ? existing.slice(0) : [];
          const localItem = itemFromServer || {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            imageUrl,
            prompt,
            userName,
            catalogName,
            userId,
            deviceId,
            isFavorite: false,
            createdAt: new Date().toISOString(),
          };
          next.unshift(localItem);
          localStorage.setItem(cacheKey, JSON.stringify(next.slice(0, 250)));
        } catch {}
      } catch (err) {
        console.error('Failed to save to gallery', err);
      }
      
      const dataObj = (typeof successData.data === 'object' && successData.data !== null) ? (successData.data as Record<string, unknown>) : null;
      const metaObj =
        (typeof successData.meta === 'object' && successData.meta !== null)
          ? (successData.meta as Record<string, unknown>)
          : (dataObj && typeof dataObj.meta === 'object' && dataObj.meta !== null)
            ? (dataObj.meta as Record<string, unknown>)
            : {};
      const requestId = String((dataObj && typeof dataObj.requestId !== 'undefined' ? dataObj.requestId : successData.requestId) || '');
      const meta = {
        ...payload,
        duration: `${Date.now() - start}ms`,
        model: quantumMode ? 'Quantum-v1 (Wolfram+Qiskit)' : 'Fusion Service (Diffusers)',
        requestId,
        ...metaObj
      };

      setGenerationMetadata({
        timestamp: new Date().toISOString(),
        model: String(meta.model),
        params: meta,
      });

      try {
        localStorage.setItem(
          'foreverteck.studio.lastImage',
          JSON.stringify({ imageUrl, meta, prompt, quantumMode }),
        );
      } catch {}

      try {
        const storedUserRaw = localStorage.getItem('user');
        const storedUser = storedUserRaw ? (JSON.parse(storedUserRaw) as { id?: string; premiumCreator?: boolean }) : null;
        const access = getCreatorAccess(storedUser);
        const existingRaw = localStorage.getItem('foreverteck.studio.savedGenerations');
        const existing = existingRaw ? (JSON.parse(existingRaw) as StoredGenerationRecord[]) : [];
        const storageResult = saveStoredGeneration(Array.isArray(existing) ? existing : [], {
          access,
          record: {
            id: requestId || `generation-${Date.now()}`,
            prompt,
            imageUrl,
            createdAt: new Date().toISOString(),
            storedVia: quantumMode ? 'quantum_paid' : access.hasPremiumCreatorAccess ? 'premium_creator' : 'free',
          },
        });
        if (storageResult.saved) {
          localStorage.setItem(
            'foreverteck.studio.savedGenerations',
            JSON.stringify(storageResult.records.slice(0, 250)),
          );
        } else {
          addLog('Free storage is full. Upgrade or use paid quantum generation to keep more artwork.', 'warn', 'W_STORAGE_LIMIT');
        }
      } catch {}

      if (quantumMode) {
        const recordSeed =
          typeof metaObj.seed === 'string' || typeof metaObj.seed === 'number'
            ? metaObj.seed
            : '';
        const nextRecord = {
          id: requestId || String(recordSeed || `record-${Date.now()}`),
          createdAt: new Date().toISOString(),
          prompt,
          imageUrl,
          model: String(meta.model),
          metadata: meta,
        };
        setQuantumRecord(nextRecord);
        try {
          localStorage.setItem('foreverteck.studio.lastQuantumRecord', JSON.stringify(nextRecord));
          const existingRaw = localStorage.getItem('foreverteck.pixelqrypt.sourceRecords');
          const existing = existingRaw ? (JSON.parse(existingRaw) as SourceRecordLike[]) : [];
          const nextRecords = upsertSourceRecord(Array.isArray(existing) ? existing : [], nextRecord);
          localStorage.setItem('foreverteck.pixelqrypt.sourceRecords', JSON.stringify(nextRecords.slice(0, 250)));
        } catch {}
      } else {
        setQuantumRecord(null);
      }
      
      setLastGenTimestamp(Date.now());

      // Trigger the automated build pipeline
      if (process.env.NODE_ENV !== 'production') {
        try {
          addLog('Triggering automated build pipeline...', 'info', 'I_BUILD_TRIGGER');
          await fetch('/api/build', { method: 'POST' });
          addLog('Build pipeline triggered successfully', 'success', 'I_BUILD_SUCCESS');
        } catch (buildErr: unknown) {
          addLog('Failed to trigger build pipeline: ' + ((buildErr as Error).message || String(buildErr)), 'warn', 'E_BUILD_FAILED');
        }
      }

    } catch (e: unknown) {
      console.error(e);
      const finalErr =
        (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message?: unknown }).message === 'string')
          ? (e as { message: string }).message
          : (e instanceof Error ? e.message : 'Failed to connect to generation service');
      setGenerationError(finalErr);
      addLog(`Final failure: ${finalErr}`, 'error', 'E_FINAL');
      setPipelineStage('Failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const postContentAction = async () => {
    if (!postContent) return;
    setIsPosting(true);
    setPostingStatus(null);
    try {
      const mediaToPost = posterAttachedImage || generatedImage;
      if (mediaToPost) {
        await validatePosterImage(mediaToPost);
      }
      const platforms: string[] = [];
      if (socialAccounts.twitter?.authenticated) platforms.push('twitter');
      if (socialAccounts.telegram?.authenticated) platforms.push('telegram');
      if (socialAccounts.instagram?.authenticated) platforms.push('instagram');
      if (socialAccounts.tiktok?.authenticated) platforms.push('tiktok');
      if (socialAccounts.youtube?.authenticated) platforms.push('youtube');
      if (socialAccounts.reddit?.authenticated) platforms.push('reddit');
      if (socialAccounts.discord?.authenticated) platforms.push('discord');
      if (socialAccounts.rss?.authenticated) platforms.push('rss');
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          content: postContent,
          platforms,
          metadata: { mediaUrl: mediaToPost || undefined },
          userId: 'user-123',
          scheduledFor: scheduleAt || undefined,
          ipfs: ipfsEnabled
        })
      });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (!data) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (!res.ok) {
        const errRaw =
          (typeof data === 'object' && data !== null && 'error' in data)
            ? (data as { error?: unknown }).error
            : null;
        const err = typeof errRaw === 'string' ? errRaw.trim() : '';
        const resultsRaw =
          (typeof data === 'object' && data !== null && 'results' in data)
            ? (data as { results?: unknown }).results
            : null;
        const resultsText = resultsRaw ? (() => { try { return JSON.stringify(resultsRaw); } catch { return ''; } })() : '';
        const suffix = err || resultsText;
        throw new Error(suffix ? `HTTP ${res.status}: ${suffix}` : `HTTP ${res.status}`);
      }

      if (data.success) {
        setPostingStatus('success');
        setPostContent('');
        setPosterAttachedImage(null);
      } else {
        const err = data.error;
        setPostingStatus(typeof err === 'string' ? err : (err ? JSON.stringify(err) : 'error'));
      }
    } catch (e) {
      console.error(e);
      const msg =
        (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message?: unknown }).message === 'string')
          ? (e as { message: string }).message
          : (e instanceof Error ? e.message : 'network-error');
      setPostingStatus(msg || 'network-error');
    } finally {
      setIsPosting(false);
    }
  };

  const resizeAndUpload = async (src: string, targetW: number, targetH: number, filename: string) => {
    const img = document.createElement('img');
    
    let fetchSrc = src;
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
      // Route through local proxy to bypass CORS restrictions
      fetchSrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;
    }
    
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = fetchSrc;
    });
    if (!loaded) throw new Error('Image load failed');
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas ctx unavailable');
    const srcRatio = img.width / img.height;
    const dstRatio = targetW / targetH;
    let drawW = targetW, drawH = targetH, dx = 0, dy = 0;
    if (srcRatio > dstRatio) {
      drawH = targetH;
      drawW = Math.round(targetH * srcRatio);
      dx = Math.round((targetW - drawW) / 2);
    } else {
      drawW = targetW;
      drawH = Math.round(targetW / srcRatio);
      dy = Math.round((targetH - drawH) / 2);
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, dx, dy, drawW, drawH);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', 0.92));
    const fd = new FormData();
    fd.append('image', blob, filename);
    const res = await fetch(`${MIRROR_API_URL}/api/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) throw new Error('Upload failed');
    return data.url || data.localUrl;
  };

  const validatePosterImage = async (url: string) => {
    if (!url) {
      throw new Error('Empty image URL');
    }

    const img = document.createElement('img');

    const isData = url.startsWith('data:');
    const isRelative = !isData && url.startsWith('/');
    const isSameOriginAbsolute = (() => {
      if (isData || isRelative) return false;
      try {
        const u = new URL(url);
        return typeof window !== 'undefined' && u.origin === window.location.origin;
      } catch {
        return false;
      }
    })();

    img.crossOrigin = 'anonymous';
    const directUrl = url;
    const proxiedUrl = isData ? url : `/api/proxy-image?url=${encodeURIComponent(url)}`;

    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = isData || isRelative || isSameOriginAbsolute ? directUrl : proxiedUrl;
    });

    if (!loaded) {
      if (isData) {
        throw new Error('Image validation failed');
      }
      const fallbackLoaded = await new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = proxiedUrl;
      });
      if (!fallbackLoaded) {
        throw new Error('Image validation failed');
      }
    }

    if (img.width < 300 || img.height < 300) {
      throw new Error('Image too small for poster');
    }
  };

  const handleImportToPoster = async () => {
    if (!generatedImage || importing) return;
    try {
      setImporting(true);
      setImportStatus(null);
      setImportProgress(25);
      if (testMode) {
        setPosterAttachedImage(generatedImage);
        setImportProgress(100);
        setImportStatus('success');
        setTimeout(() => setImporting(false), 200);
        return;
      }
      const original = generatedImage;
      const igUrl = await resizeAndUpload(original, 1080, 1080, `ig-${Date.now()}.jpg`);
      const primaryUrl = igUrl || original;
      await validatePosterImage(primaryUrl);
      
      setPosterAttachedImage(primaryUrl);
      
      setImportProgress(40);
      const fbUrl = await resizeAndUpload(original, 1200, 630, `fb-${Date.now()}.jpg`);
      const twUrl = await resizeAndUpload(original, 1200, 675, `tw-${Date.now()}.jpg`);
      const thumbUrl = await resizeAndUpload(original, 200, 200, `thumb-${Date.now()}.jpg`);
      setImportProgress(60);
      const meta = {
        title: 'AI Asset',
        mediaUrl: primaryUrl,
        platformMediaUrls: { facebook: fbUrl, instagram: igUrl, twitter: twUrl },
        thumbnailUrl: thumbUrl,
        prompt,
        priceUsd: 59.99
      };
      // Note: We don't automatically POST to catalog here anymore to avoid double posting.
      // The user will click "Post to All Channels" when they are ready.
      setImportProgress(100);
      setImportStatus('success');
    } catch (e: unknown) {
      setImportProgress(0);
      setImportStatus('error');
    } finally {
      setTimeout(() => setImporting(false), 400);
    }
  };

  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  const firstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  const formatScheduled = (y: number, m: number, d: number) => {
    const dt = new Date(y, m, d, 9, 0, 0);
    const iso = dt.toISOString().slice(0,16);
    setScheduleAt(iso);
  };
  const monthLabel = (y: number, m: number) => {
    return new Date(y, m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  };
  const visibleRangeStart = rangeStart;
  const visibleRangeEnd = rangeEnd;
  const inSelectedRange = (y: number, m: number, d: number) => {
    if (!visibleRangeStart || !visibleRangeEnd) return false;
    const start = new Date(visibleRangeStart);
    const end = new Date(visibleRangeEnd);
    const current = new Date(y, m, d);
    return current >= start && current <= end;
  };
  const isStartDay = (y: number, m: number, d: number) => {
    if (!visibleRangeStart) return false;
    const start = new Date(visibleRangeStart);
    return start.getFullYear() === y && start.getMonth() === m && start.getDate() === d;
  };
  const isEndDay = (y: number, m: number, d: number) => {
    if (!visibleRangeEnd) return false;
    const end = new Date(visibleRangeEnd);
    return end.getFullYear() === y && end.getMonth() === m && end.getDate() === d;
  };
  const validateRange = (startISO: string, endISO: string) => {
    if (startISO && endISO) {
      const s = new Date(startISO);
      const e = new Date(endISO);
      if (e < s) {
        setRangeError('End date must be after start date');
        return false;
      }
    }
    setRangeError(null);
    return true;
  };
  const clearRange = () => {
    setRangeStart('');
    setRangeEnd('');
    setRangeError(null);
  };
  const clearSelectedDates = () => {
    setSelectedDates([]);
  };
  const isIndividuallySelected = (y: number, m: number, d: number) => {
    const iso = new Date(y, m, d).toISOString();
    return selectedDates.includes(iso);
  };
  const toggleIndividualDate = (iso: string) => {
    setSelectedDates(prev => {
      if (prev.includes(iso)) {
        return prev.filter(x => x !== iso);
      }
      return [...prev, iso];
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-hydrated={hydrated ? '1' : '0'}>
      <Header />
      <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Creator Studio</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-4 sm:p-6 lg:p-8 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="text-purple-400" />
                <h2 className="text-2xl font-bold">AI Asset Generator</h2>
              </div>
              <DataDashboardButton />
            </div>
            
            <div className="space-y-4">
              <textarea 
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-4 h-32 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Describe the image and post content you want to generate..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={crossOptimizePrompt}
                  disabled={crossOptimizeLoading || !prompt || isGenerating}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm border ${crossOptimizeLoading || !prompt || isGenerating ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 border-blue-500/30 text-white'}`}
                >
                  {crossOptimizeLoading ? 'Optimizing...' : 'Optimize Prompt (Cross-Agent)'}
                </button>
                {crossOptimizeError && (
                  <div className="text-sm text-yellow-300">
                    {crossOptimizeError}
                  </div>
                )}
              </div>
              {crossOptimizeReports && (
                <div className="rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300 space-y-2">
                  {crossOptimizeReports.map((r, idx) => (
                    <div key={`${r.model}-${idx}`} className="border-b border-gray-800 pb-2 last:border-b-0 last:pb-0">
                      <div className="text-gray-400">
                        {String(r.role)} • {String(r.model)}{r.error ? ` • error=${String(r.error)}` : ''}
                      </div>
                      {!r.error && (
                        <div className="mt-1 whitespace-pre-wrap">{String(r.output).slice(0, 1200)}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <label className={`rounded-lg border p-3 transition-all cursor-pointer ${!quantumMode ? 'border-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.08)]' : 'border-gray-700 hover:border-gray-600'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="generationMode"
                      aria-label="Standard Generation"
                      className="mt-1 h-4 w-4 accent-white"
                      checked={!quantumMode}
                      onChange={() => setQuantumMode(false)}
                    />
                    <div>
                      <span className={!quantumMode ? 'block font-semibold text-white' : 'block text-gray-300'}>Standard Generation</span>
                      <span className="mt-1 block text-xs text-gray-400">Create normally without a real quantum-backed seed.</span>
                    </div>
                  </div>
                </label>
                <label className={`rounded-lg border p-3 transition-all cursor-pointer ${quantumMode ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-gray-700 hover:border-gray-600'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="generationMode"
                      aria-label="Real Quantum Generation - $9.99"
                      className="mt-1 h-4 w-4 accent-purple-500"
                      checked={quantumMode}
                      onChange={() => setQuantumMode(true)}
                    />
                    <div>
                      <span className={quantumMode ? 'block font-semibold text-purple-300' : 'block text-gray-300'}>Real Quantum Generation - $9.99</span>
                      <span className="mt-1 block text-xs text-gray-400">Generate with a real quantum computer and unlock a verified origin record.</span>
                    </div>
                  </div>
                </label>
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                <div className="text-sm font-semibold text-white">Premium Creator - $24.99/month</div>
                <div className="mt-2 text-sm text-purple-100/90">
                  Earn 45% on creator-linked sales, unlock QR selling, and expand storage for your images, seeds, math, code, and source records.
                </div>
                <div className="mt-2 text-xs text-purple-100/75">
                  Free accounts can keep 5 stored generations. Paid quantum artworks always keep their source record.
                </div>
                <Link
                  href="/profile?upgrade=premium-creator"
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-purple-300/30 bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
                >
                  Upgrade to Premium Creator
                </Link>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className={`flex items-center gap-2 text-sm p-2 rounded-lg border transition-all cursor-pointer ${ipfsEnabled ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-gray-700 hover:border-gray-600'}`}>
                  <input type="checkbox" className="w-4 h-4 accent-green-500" checked={ipfsEnabled} onChange={e => setIpfsEnabled(e.target.checked)} />
                  <span className={ipfsEnabled ? 'text-green-300 font-semibold' : 'text-gray-300'}>Public Link Upload</span>
                </label>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-3 text-sm text-gray-300">
                {generationMode === 'real_quantum'
                  ? (quantumUnlocked
                    ? 'Real quantum generation unlocked. Run the generation to create your verified origin record.'
                    : 'Real quantum generation requires a $9.99 unlock before generation.')
                  : 'Standard generation creates the asset without the paid real quantum record.'}
              </div>
              <div className="text-xs text-gray-400">
                Public Link Upload saves your generated image and provides a shareable, public link. Turn this on if you want a more reliable link for printing and sharing. Uploading can take longer. Avoid using private or sensitive images.
              </div>
              <button 
                onClick={handleGenerationAction}
                disabled={isGenerating || !prompt}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${isGenerating || !prompt ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500'}`}
              >
                {generationButtonLabel}
              </button>
            </div>

            <div className="mt-8 w-full flex flex-col gap-4">
              {isGenerating && (
                <div className="w-full rounded-lg border border-gray-700 bg-gray-900 p-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-purple-500 animate-pulse w-6 h-6" />
                    <div className="text-sm font-semibold text-white">{pipelineStage}</div>
                  </div>
                  <div className="mt-3 w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between w-full text-xs text-gray-400">
                    <span>Attempt: {generationAttempt}/{generationMaxAttempts}</span>
                    <span>{etaSeconds !== null ? `ETA: ${etaSeconds}s • ${progress}%` : `${progress}%`}</span>
                  </div>
                </div>
              )}

              {(logs.length > 0 || isGenerating) && (
                <div className="w-full h-48 bg-black rounded-lg border border-gray-700 p-4 font-mono text-xs overflow-y-auto flex flex-col gap-1 shadow-inner">
                   <div className="text-gray-500 mb-2 border-b border-gray-800 pb-1 flex justify-between sticky top-0 bg-black z-10">
                      <span>Terminal: System Logs</span>
                      <span className={pipelineStage === 'Failed' ? 'text-red-500' : pipelineStage === 'Complete' ? 'text-green-500' : 'text-purple-500'}>
                        Status: {pipelineStage}
                      </span>
                   </div>
                   {logs.map((log, i) => (
                     <div key={i} className={`flex gap-3 ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-300'}`}>
                       <span className="text-gray-600 shrink-0">[{log.time}]</span>
                       <span className="uppercase w-12 shrink-0">[{log.type}]</span>
                       {log.code && <span className="text-gray-500 shrink-0">[{log.code}]</span>}
                       <span className="break-words">{log.msg}</span>
                     </div>
                   ))}
                </div>
              )}

              {importStatus === 'success' && (
                <div className="mt-3 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-2 text-sm">
                  Imported successfully
                </div>
              )}
              {importStatus === 'error' && (
                <div className="mt-3 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-2 text-sm">
                  Partial failure. Retry import.
                </div>
              )}
              {typeof generationMetadata?.params?.ipfs_url === 'string' && (
                <div className="mt-4 p-3 rounded-lg bg-blue-900/30 border border-blue-500/30 flex items-center justify-between text-sm">
                  <span className="text-blue-300 font-mono truncate max-w-[80%]">
                    Link: {String(generationMetadata.params.ipfs_url)}
                  </span>
                  <a 
                    href={String(generationMetadata.params.ipfs_url).replace('ipfs://', 'https://ipfs.io/ipfs/')} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-bold text-xs uppercase"
                  >
                    View
                  </a>
                </div>
              )}
            </div>

            <FusionAI 
              prompt={prompt} 
              baseImageUrl={generatedImage}
              onImageGenerated={(url) => setGeneratedImage(url)} 
            />

            <div className="mt-8 border-t border-gray-700 pt-8">
              <h3 className="text-xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">Latest Build Preview</h3>
              <div className="text-sm text-gray-400">
                Your most recent generation. Customize it, choose sizing, add an optional QR link, and checkout with card payment.
              </div>
              <div className="aspect-video relative rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
                <LatestAIImage
                  key={lastGenTimestamp}
                  overrideUrl={generatedImage}
                  onResolvedUrl={setLatestDropImageUrl}
                />
              </div>
              {latestDropImageUrl ? (
                <div className="mt-5 rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="mb-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Finished Product</div>
                    <div className="mt-2 text-sm text-zinc-400">
                      See how the latest generation looks as a buyer-ready shirt before opening the full merch editor.
                    </div>
                  </div>
                  <MerchPreviewPanel
                    imageUrl={latestDropImageUrl}
                    prompt={(prompt || generatedTextContent).trim()}
                    productName="Premium Tee"
                    printType="standard"
                    enablePrintifyMockups
                  />
                </div>
              ) : null}
              {latestDropImageUrl ? (
                <Link
                  href={`/customize?imageUrl=${encodeURIComponent(latestDropImageUrl)}${
                    (prompt || generatedTextContent).trim()
                      ? `&prompt=${encodeURIComponent((prompt || generatedTextContent).trim())}`
                      : ''
                  }`}
                  className="mt-4 w-full py-3 rounded-lg font-bold bg-white hover:bg-zinc-200 text-black flex items-center justify-center"
                >
                  Customize Your Gear
                </Link>
              ) : null}
              {quantumRecord && quantumRecordUrl ? (
                <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <div className="text-sm font-semibold text-purple-200">Verified Origin Record created</div>
                  <div className="mt-1 text-xs text-purple-100/80">
                    Your seed is now part of the first generation of quantum-verified art records.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {quantumSourceLinks ? (
                      <Link
                        href={quantumSourceLinks.sourceRecordPath}
                        className="rounded-lg border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold text-white hover:bg-black/60"
                      >
                        View Record
                      </Link>
                    ) : null}
                    <a
                      href={quantumRecordUrl}
                      download={`pixelqrypt-origin-record-${quantumRecord.id}.txt`}
                      className="rounded-lg border border-purple-400/30 bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
                    >
                      Download Record
                    </a>
                    {quantumSourceLinks?.externalSourceUrl ? (
                      <a
                        href={quantumSourceLinks.externalSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-purple-300/30 bg-black/30 px-4 py-2 text-sm font-semibold text-purple-100 hover:bg-black/50"
                      >
                        {quantumSourceLinks.externalSourceLabel}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {generatedImage && generatedTextContent && (
                <button
                  onClick={() => {
                    setPostContent(generatedTextContent);
                    setPosterAttachedImage(generatedImage);
                    document.getElementById('multi-channel-poster')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mt-4 w-full py-3 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send to Multi-Channel Poster
                </button>
              )}
            </div>
          </div>

          <div
            id="multi-channel-poster"
            className="bg-gradient-to-b from-gray-800 to-gray-900 p-4 sm:p-6 lg:p-8 rounded-xl border border-gray-700"
          >
            <div className="flex items-center gap-3 mb-6">
              <Send className="text-blue-400" />
              <h2 className="text-2xl font-bold">Multi-Channel Poster</h2>
            </div>

            <div className="space-y-4">
              <textarea 
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-4 h-32 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="What's on your mind? #Web3"
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
              />
              {posterAttachedImage && (
                <div className="relative mt-2 rounded-lg border border-gray-700 overflow-hidden bg-black/50 aspect-video max-w-sm">
                  <img 
                    src={posterAttachedImage} 
                    alt="Attached preview" 
                    className="w-full h-full object-contain" 
                  />
                  <button 
                    onClick={() => setPosterAttachedImage(null)}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-red-600/80 text-white rounded-full p-1.5 transition-colors"
                    title="Remove attachment"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-xs text-white px-2 py-1 rounded">
                    Attached to Post
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">Live Chat</div>
                  <div className={`text-xs ${chatConnected ? 'text-green-300' : 'text-yellow-300'}`}>
                    {chatConnected ? 'Connected' : 'Reconnecting'}
                  </div>
                </div>
                <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
                  {chatPreview.length === 0 && (
                    <div className="text-xs text-gray-500">No messages yet</div>
                  )}
                  {chatPreview.map((m) => (
                    <div key={m.id} className="text-xs text-gray-200 border-b border-gray-800 pb-2 last:border-b-0 last:pb-0">
                      <div className="text-gray-400">{new Date(m.time).toLocaleTimeString()} • {m.user}</div>
                      {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}
                      {m.assetUrl && (
                        <a className="text-blue-400 hover:text-blue-300 break-all" href={m.assetUrl} target="_blank" rel="noreferrer">
                          {m.assetUrl}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={chatUser}
                    onChange={(e) => setChatUser(e.target.value)}
                    className="w-28 bg-gray-950 border border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-200"
                    placeholder="Name"
                  />
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200"
                    placeholder="Discuss the generated asset..."
                  />
                  <button
                    onClick={() => sendChat()}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-blue-500/30 bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    Send
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={!generatedImage}
                    onClick={() => sendChat(generatedImage)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border ${generatedImage ? 'border-purple-500/30 bg-purple-600 hover:bg-purple-500 text-white' : 'border-gray-800 bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                  >
                    Share Asset to Chat
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="datetime-local" 
                  className="bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm"
                  value={scheduleAt}
                  onChange={e => setScheduleAt(e.target.value)}
                />
                <span className="text-xs text-gray-400">Schedule (optional)</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 my-4">
                {['twitter', 'telegram', 'instagram', 'tiktok', 'youtube', 'reddit', 'discord', 'rss'].map((platform) => {
                  const account = socialAccounts[platform];
                  const labels: Record<string, string> = {
                    twitter: 'Twitter',
                    telegram: 'Telegram',
                    instagram: 'Instagram',
                    tiktok: 'TikTok',
                    youtube: 'YouTube',
                    reddit: 'Reddit',
                    discord: 'Discord',
                    rss: 'RSS',
                  };
                  const colors: Record<string, string> = {
                    twitter: 'bg-[#1DA1F2] border-[#1DA1F2]',
                    telegram: 'bg-[#0088cc] border-[#0088cc]',
                    instagram: 'bg-[#E1306C] border-[#E1306C]',
                    tiktok: 'bg-[#000000] border-[#333333]',
                    youtube: 'bg-[#FF0000] border-[#FF0000]',
                    reddit: 'bg-[#FF4500] border-[#FF4500]',
                    discord: 'bg-[#5865F2] border-[#5865F2]',
                    rss: 'bg-[#f59e0b] border-[#f59e0b]',
                  };
                  
                  if (account === null) {
                    return <div key={platform} className="px-3 py-2 rounded-lg text-sm font-semibold border bg-gray-800 border-gray-700 animate-pulse text-transparent">Loading...</div>;
                  }
                  
                  if (account.authenticated) {
                    return (
                      <div key={platform} className={`col-span-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${colors[platform]} bg-opacity-20`}>
                        <span className="font-semibold truncate">@{account.screenName || platform}</span>
                        <button 
                          onClick={() => {
                            fetch(`/api/auth/${platform}/logout`, { method: 'POST' }).then(() => {
                              setSocialAccounts(prev => ({ ...prev, [platform]: { authenticated: false } }));
                            });
                          }} 
                          className="text-xs text-gray-400 underline hover:text-gray-200 ml-2"
                        >
                          Logout
                        </button>
                      </div>
                    );
                  }
                  
                  return (
                    <button
                      key={platform}
                      onClick={() => {
                        if (platform === 'telegram') {
                          alert('Telegram posting uses a Bot token + Chat ID. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID on the server, then refresh.');
                          return;
                        }
                        if (platform === 'discord') {
                          window.location.href = '/profile';
                          return;
                        }
                        if (platform === 'rss') {
                          window.open('/rss.xml', '_blank');
                          return;
                        }
                        window.location.href = `/api/auth/${platform}/login`;
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border ${colors[platform]} text-white flex items-center justify-center gap-2 transition hover:opacity-80`}
                    >
                      {platform === 'telegram'
                        ? 'Configure Telegram'
                        : platform === 'discord'
                          ? 'Configure Discord'
                          : platform === 'rss'
                            ? 'Open RSS feed'
                            : `Sign in to ${labels[platform]}`}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-300 font-semibold">{monthLabel(calendarYear, calendarMonth)}</div>
                  <div className="flex gap-2">
                    <div className="hidden sm:flex items-center gap-2 mr-4">
                      <button
                        aria-label="Toggle range selection mode"
                        aria-pressed={rangeMode}
                        onClick={() => setRangeMode(v => !v)}
                        className={`px-2 py-1 rounded border text-xs ${rangeMode ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-700 bg-gray-800 text-gray-200'}`}
                      >
                        {rangeMode ? 'Range Mode: On' : 'Range Mode: Off'}
                      </button>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 mr-4">
                      <label htmlFor="range-start" className="text-xs text-gray-400">Start</label>
                      <input
                        id="range-start"
                        aria-label="Start date"
                        type="date"
                        value={rangeStart ? rangeStart.slice(0,10) : ''}
                        onChange={e => {
                          const iso = e.target.value ? new Date(e.target.value).toISOString() : '';
                          setRangeStart(iso);
                          validateRange(iso, rangeEnd);
                        }}
                        className="bg-gray-900 border border-gray-700 rounded p-1 text-xs"
                      />
                      <label htmlFor="range-end" className="text-xs text-gray-400">End</label>
                      <input
                        id="range-end"
                        aria-label="End date"
                        type="date"
                        value={rangeEnd ? rangeEnd.slice(0,10) : ''}
                        onChange={e => {
                          const iso = e.target.value ? new Date(e.target.value).toISOString() : '';
                          setRangeEnd(iso);
                          validateRange(rangeStart, iso);
                        }}
                        className="bg-gray-900 border border-gray-700 rounded p-1 text-xs"
                      />
                      <button
                        aria-label="Clear date range"
                        className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-xs"
                        onClick={clearRange}
                      >Clear</button>
                      <button
                        aria-label="Clear selected dates"
                        className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-xs"
                        onClick={clearSelectedDates}
                      >Clear Dates</button>
                    </div>
                    <button
                      className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-xs"
                      onClick={() => {
                        const prev = new Date(calendarYear, calendarMonth - 1, 1);
                        setCalendarYear(prev.getFullYear());
                        setCalendarMonth(prev.getMonth());
                      }}
                    >Prev</button>
                    <button
                      className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-xs"
                      onClick={() => {
                        const next = new Date(calendarYear, calendarMonth + 1, 1);
                        setCalendarYear(next.getFullYear());
                        setCalendarMonth(next.getMonth());
                      }}
                    >Next</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-1" role="row">
                  <div className="text-center">Sun</div>
                  <div className="text-center">Mon</div>
                  <div className="text-center">Tue</div>
                  <div className="text-center">Wed</div>
                  <div className="text-center">Thu</div>
                  <div className="text-center">Fri</div>
                  <div className="text-center">Sat</div>
                </div>
                <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
                  {Array.from({ length: firstDayOfWeek(calendarYear, calendarMonth) }).map((_, i) => (
                    <div key={`empty-${i}`} className={`${styles.calendarDay} border border-gray-800 h-10 rounded bg-gray-900`} role="gridcell" />
                  ))}
                  {Array.from({ length: daysInMonth(calendarYear, calendarMonth) }).map((_, i) => {
                    const day = i + 1;
                    const isSelected = scheduleAt && new Date(scheduleAt).getDate() === day &&
                      new Date(scheduleAt).getMonth() === calendarMonth && new Date(scheduleAt).getFullYear() === calendarYear;
                    const inRange = inSelectedRange(calendarYear, calendarMonth, day);
                    const isStart = isStartDay(calendarYear, calendarMonth, day);
                    const isEnd = isEndDay(calendarYear, calendarMonth, day);
                    const ariaLabel = new Date(calendarYear, calendarMonth, day).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                    const dateISO = new Date(calendarYear, calendarMonth, day).toISOString();
                    const isSingleSelection = visibleRangeStart && visibleRangeEnd && visibleRangeStart === visibleRangeEnd && isStart;
                    const individuallySelected = isIndividuallySelected(calendarYear, calendarMonth, day);
                    return (
                      <button
                        key={`day-${day}`}
                        onClick={() => {
                          const iso = dateISO;
                          if (rangeMode) {
                            if (!rangeStart) {
                              setRangeStart(iso);
                              setRangeEnd('');
                              setRangeError(null);
                            } else {
                              const a = new Date(rangeStart);
                              const b = new Date(iso);
                              const startISO = (a < b ? a : b).toISOString();
                              const endISO = (a < b ? b : a).toISOString();
                              setRangeStart(startISO);
                              setRangeEnd(endISO);
                              validateRange(startISO, endISO);
                            }
                          } else {
                            toggleIndividualDate(iso);
                          }
                        }}
                        className={`${styles.calendarDay} border h-10 rounded text-sm ${inRange ? styles.calendarDayInRange : 'border-gray-700 bg-gray-800 text-gray-200'} ${individuallySelected ? styles.calendarDayIndividuallySelected : ''} ${isStart ? styles.calendarDayRangeStart : ''} ${isEnd ? styles.calendarDayRangeEnd : ''}`}
                        title={`${day}/${calendarMonth + 1}/${calendarYear}`}
                        role="gridcell"
                        aria-selected={inRange || individuallySelected || isSingleSelection ? true : undefined}
                        aria-label={ariaLabel}
                        id={`calendar-day-${day}`}
                        onKeyDown={e => {
                          const key = e.key;
                          let targetDay = day;
                          if (key === 'ArrowRight') targetDay = day + 1;
                          if (key === 'ArrowLeft') targetDay = day - 1;
                          if (key === 'ArrowUp') targetDay = day - 7;
                          if (key === 'ArrowDown') targetDay = day + 7;
                          if (key === 'Enter' || key === ' ') {
                            const iso = dateISO;
                            if (rangeMode) {
                              if (!rangeStart) {
                                setRangeStart(iso);
                                setRangeEnd('');
                                setRangeError(null);
                              } else {
                                const a = new Date(rangeStart);
                                const b = new Date(iso);
                                const startISO = (a < b ? a : b).toISOString();
                                const endISO = (a < b ? b : a).toISOString();
                                setRangeStart(startISO);
                                setRangeEnd(endISO);
                                validateRange(startISO, endISO);
                              }
                            } else {
                              toggleIndividualDate(iso);
                            }
                          }
                          if (targetDay >= 1 && targetDay <= daysInMonth(calendarYear, calendarMonth)) {
                            const el = document.getElementById(`calendar-day-${targetDay}`);
                            if (el) (el as HTMLElement).focus();
                          }
                        }}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span>{day}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {scheduleAt ? `Scheduled for: ${new Date(scheduleAt).toLocaleString()}` : 'No schedule set'}
                </div>
                <div className="mt-1 text-xs">
                  {rangeError && <span className="text-red-400">{rangeError}</span>}
                  {!rangeError && rangeStart && rangeEnd && (
                    <span className="text-gray-300">
                      Selected: {new Date(rangeStart).toLocaleDateString()} – {new Date(rangeEnd).toLocaleDateString()}
                    </span>
                  )}
                  {!rangeError && selectedDates.length > 0 && (
                    <div className="text-gray-300 mt-1">
                      Dates: {selectedDates.map(d => new Date(d).toLocaleDateString()).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={postContentAction}
                disabled={isPosting}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${isPosting ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
              >
                {isPosting ? 'Broadcasting...' : 'Post to All Channels'}
              </button>
              <div className="mt-2 text-xs text-gray-400">
                If a platform login page keeps resetting, try turning off ad/tracker blockers for the login domain, disabling privacy extensions, or using a Private/Incognito window.
              </div>

              {postingStatus === 'success' && (
                <div className="mt-3 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-2 text-sm">
                  Posted successfully
                </div>
              )}
              {postingStatus && postingStatus !== 'success' && (
                <div className="mt-3 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-2 text-sm">
                  {postingStatus === 'network-error' ? 'Network error while posting' : `Posting failed: ${postingStatus}`}
                </div>
              )}
            </div>
            
            <div className="mt-8 p-4 bg-gray-900 rounded-lg text-sm text-gray-400">
              <p>Pro Tip: Use the Screenshot Manager service for capturing web assets.</p>
              {(() => {
                const base =
                  process.env.NEXT_PUBLIC_SCREENSHOT_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:4010' : '');
                if (!base) {
                  return <div className="mt-2 text-xs text-gray-500">Set NEXT_PUBLIC_SCREENSHOT_URL to enable Screenshot Manager.</div>;
                }
                return (
                  <a href={`${base}/api/screenshots`} target="_blank" className="text-blue-400 hover:underline mt-2 inline-block">
                    Open Screenshot Manager
                  </a>
                );
              })()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
