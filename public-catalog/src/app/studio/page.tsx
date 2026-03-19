
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { DataDashboardButton } from '../../components/DataDashboardButton';
import { FusionAI } from '../../components/FusionAI';
import { ImagePreview } from '../../components/ImagePreview';
import { LatestAIImage } from '../../components/LatestAIImage';
import { Send, Sparkles } from 'lucide-react';
import styles from './page.module.css';

import { MIRROR_API_URL } from '@/lib/utils';

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
  const [hydrated, setHydrated] = useState(false);
  const [prompt, setPrompt] = useState('Cinematic wide establishing shot of a vast futuristic megacity at golden hour, dense urban grid filled with thousands of warm amber lights in the foreground, distant layered mountains and a sharp jagged peak on the horizon, a cluster of ultra-tall sleek curved glass-and-metal skyscrapers dominating the right side with vertical electric-blue illuminated seams, atmospheric haze and volumetric light, soft bloom, high detail, realistic materials, epic scale, warm peach sunset sky with a large soft cloud mass in the upper left, sharp architecture silhouettes, ultra high quality sci‑fi concept art, photoreal lighting, 1024x1024');
  const [generatedImage, setGeneratedImage] = useState('');
  const [draftImage, setDraftImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationAttempt, setGenerationAttempt] = useState(0);
  const [generationMetadata, setGenerationMetadata] = useState<{
    timestamp: string;
    model: string;
    params: Record<string, unknown>;
  } | undefined>(undefined);
  const [cfTopic, setCfTopic] = useState('');
  const [cfPlatforms, setCfPlatforms] = useState({ linkedin: true, instagram: true, twitter: true });
  const [cfProvider, setCfProvider] = useState<'mock' | 'dalle' | 'stablediffusion' | 'midjourney'>('mock');
  const [cfSafety, setCfSafety] = useState(true);
  const [cfAutoSocial, setCfAutoSocial] = useState(false);
  const [cfItems, setCfItems] = useState<Array<{ platform: 'linkedin' | 'instagram' | 'twitter'; text_content: string; image_url: string; generation_metadata: Record<string, unknown> }>>([]);
  const [cfLoading, setCfLoading] = useState(false);
  const [cfError, setCfError] = useState<string | null>(null);
  const [catalogPosts, setCatalogPosts] = useState<Array<{ id: string; content: string }>>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<Array<{ platform: 'linkedin' | 'instagram' | 'twitter'; text_content: string; image_url: string; generation_metadata: Record<string, unknown> }>>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>('');
  const [ipfsEnabled, setIpfsEnabled] = useState<boolean>(false);
  const [quantumMode, setQuantumMode] = useState<boolean>(false);
  const [postingStatus, setPostingStatus] = useState<string | null>(null);
  const [twitterEnabled, setTwitterEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [instagramEnabled, setInstagramEnabled] = useState(false);
  const [tiktokEnabled, setTiktokEnabled] = useState(false);
  const [youtubeEnabled, setYoutubeEnabled] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rangeMode, setRangeMode] = useState<boolean>(false);
  const [lastGenTimestamp, setLastGenTimestamp] = useState<number>(Date.now());

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
    setHydrated(true);
  }, []);

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
        setPrompt(rec.prompt);
      }
      if (typeof rec.quantumMode === 'boolean') {
        setQuantumMode(rec.quantumMode);
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

  const generateFactoryContent = async () => {
    if (!cfTopic.trim()) return;
    setCfLoading(true);
    setCfError(null);
    try {
      const platforms = Object.entries(cfPlatforms)
        .filter(([, v]) => v)
        .map(([k]) => k) as Array<'linkedin' | 'instagram' | 'twitter'>;
      const res = await fetch('/api/content-factory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: cfTopic,
          platforms,
          imageProvider: cfProvider,
          safetyEnabled: cfSafety,
          autoSocialEnabled: cfAutoSocial,
          mode: 'full',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error('fail');
      setCfItems(data.items || []);
    } catch {
      setCfError('Failed to generate content');
    } finally {
      setCfLoading(false);
    }
  };

  const openPreview = async () => {
    if (!cfTopic.trim()) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const platforms = Object.entries(cfPlatforms)
        .filter(([, v]) => v)
        .map(([k]) => k) as Array<'linkedin' | 'instagram' | 'twitter'>;
      const res = await fetch('/api/content-factory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: cfTopic,
          platforms,
          imageProvider: cfProvider,
          safetyEnabled: cfSafety,
          autoSocialEnabled: cfAutoSocial,
          mode: 'full',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error('fail');
      setPreviewItems(data.items || []);
    } catch {
      setPreviewError('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewItems([]);
    setPreviewError(null);
    setPreviewLoading(false);
  };

  const regenerateImageFor = async (idx: number) => {
    const item = cfItems[idx];
    if (!item) return;
    try {
      const texts: Record<string, string> = {};
      texts[item.platform] = item.text_content;
      const res = await fetch('/api/content-factory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: cfTopic || item.text_content,
          platforms: [item.platform],
          imageProvider: cfProvider,
          safetyEnabled: cfSafety,
          mode: 'image_only',
          texts,
        }),
      });
      const data = await res.json();
      if (!data.success) return;
      const updated = [...cfItems];
      updated[idx] = data.items[0];
      setCfItems(updated);
    } catch {}
  };

  const updateCfText = (idx: number, text: string) => {
    const updated = [...cfItems];
    updated[idx] = { ...updated[idx], text_content: text };
    setCfItems(updated);
  };

  const applyToPoster = (idx: number) => {
    const item = cfItems[idx];
    if (!item) return;
    setPostContent(item.text_content);
    setGeneratedImage(item.image_url);
  };

  const tokens = (s: string) => s.toLowerCase().split(/\W+/).filter(Boolean);
  const similarityScore = (text: string) => {
    const t = new Set(tokens(text));
    const top5 = catalogPosts.slice(0, 20).map(p => tokens(p.content));
    let score = 0;
    for (const arr of top5) {
      const s = new Set(arr);
      let inter = 0;
      s.forEach(x => { if (t.has(x)) inter++; });
      const denom = Math.max(s.size + t.size - inter, 1);
      score += inter / denom;
    }
    return score / Math.max(top5.length, 1);
  };

  const seasonBoost = (text: string) => {
    const m = new Date().getMonth();
    const tags = ['winter','spring','summer','autumn','fall'];
    const has = tags.some(t => text.toLowerCase().includes(t));
    return has ? (m >= 5 && m <= 7 ? 1.0 : 0.6) : 0.4;
  };

  const recommendationScore = (item: { text_content: string }) => {
    return similarityScore(item.text_content) * 0.6 + seasonBoost(item.text_content) * 0.4;
  };

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

  const generateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedImage('');
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

        const timeoutMs = testMode ? 5_000 : (quantumMode ? 120_000 : 30_000);
        const attemptStartedAt = Date.now();
        let tick: ReturnType<typeof setInterval> | null = null;

        try {
          setPipelineStage(quantumMode ? 'Quantum processing' : 'Rendering image');

          tick = setInterval(() => {
            const elapsedMs = Date.now() - attemptStartedAt;
            const ratio = Math.min(1, elapsedMs / timeoutMs);
            const base = 10;
            const cap = ipfsEnabled ? 88 : 94;
            const nextProgress = Math.min(cap, Math.round(base + ratio * (cap - base)));
            setProgress((p) => Math.max(p, nextProgress));
            const remainingMs = Math.max(0, timeoutMs - elapsedMs);
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
            setPipelineStage('IPFS upload');
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
      if (typeof successData.imageUrl === 'string') imageUrl = successData.imageUrl;
      else if (typeof successData.image_url === 'string') imageUrl = successData.image_url;
      else if (typeof successData.data === 'object' && successData.data !== null) {
        const d = successData.data as Record<string, unknown>;
        if (typeof d.imageUrl === 'string') imageUrl = d.imageUrl;
        if (typeof d.image_url === 'string') imageUrl = d.image_url;
      }

      if (!imageUrl) {
        throw new Error('Generation succeeded but returned no image URL');
      }

      setGeneratedImage(imageUrl);
      setDraftImage('');
      
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
      
      setLastGenTimestamp(Date.now());

      // Trigger the automated build pipeline
      try {
        addLog('Triggering automated build pipeline...', 'info', 'I_BUILD_TRIGGER');
        await fetch('/api/build', { method: 'POST' });
        addLog('Build pipeline triggered successfully', 'success', 'I_BUILD_SUCCESS');
      } catch (buildErr) {
        addLog('Failed to trigger build pipeline', 'warn', 'E_BUILD_FAILED');
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
      if (generatedImage) {
        await validatePosterImage(generatedImage);
      }
      const platforms: string[] = [];
      if (twitterEnabled) platforms.push('twitter');
      if (telegramEnabled) platforms.push('telegram');
      if (instagramEnabled) platforms.push('instagram');
      if (tiktokEnabled) platforms.push('tiktok');
      if (youtubeEnabled) platforms.push('youtube');
      const res = await fetch(`${MIRROR_API_URL}/api/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: postContent,
          platforms,
          metadata: { mediaUrl: generatedImage || undefined },
          userId: 'user-123',
          scheduledFor: scheduleAt || undefined,
          ipfs: ipfsEnabled
        })
      });
      const data = await res.json();
      if (data.success) {
        setPostingStatus('success');
        setPostContent('');
      } else {
        const err = data.error;
        setPostingStatus(typeof err === 'string' ? err : (err ? JSON.stringify(err) : 'error'));
      }
    } catch (e) {
      console.error(e);
      setPostingStatus('network-error');
    } finally {
      setIsPosting(false);
    }
  };

  const resizeAndUpload = async (src: string, targetW: number, targetH: number, filename: string) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
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
    let path = url;
    try {
      const parsed = new URL(url);
      path = parsed.pathname;
    } catch {
    }
    if (!/\.(png|jpe?g|webp)$/i.test(path)) {
      throw new Error('Unsupported image format');
    }
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    if (!loaded) {
      throw new Error('Image validation failed');
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
        const placeholder = '(Attached: Generated Image)';
        const snippet = `${placeholder}: ${generatedImage}`;
        const currentContent = postContent;
        const finalContent = currentContent?.trim()
          ? `${currentContent.trimEnd()}\n\n${snippet}`
          : snippet;
        setPostContent(finalContent);
        setImportProgress(100);
        setImportStatus('success');
        setTimeout(() => setImporting(false), 200);
        return;
      }
      const original = generatedImage;
      const igUrl = await resizeAndUpload(original, 1080, 1080, `ig-${Date.now()}.jpg`);
      const primaryUrl = igUrl || original;
      await validatePosterImage(primaryUrl);
      const currentContent = postContent;
      const placeholder = '(Attached: Generated Image)';
      const snippet = `${placeholder}: ${primaryUrl}`;
      let finalContent: string;
      if (currentContent.includes(placeholder)) {
        finalContent = currentContent.replace(/\(Attached: Generated Image\)/g, snippet);
      } else if (currentContent.trim()) {
        finalContent = `${currentContent.trimEnd()}\n\n${snippet}`;
      } else {
        finalContent = snippet;
      }
      setPostContent(finalContent);
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
        priceUsd: 49.99
      };
      const res = await fetch(`${MIRROR_API_URL}/api/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: finalContent,
          platforms: ['facebook','instagram','twitter'],
          metadata: meta,
          userId: 'user-123'
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Post failed');
      setImportProgress(90);
      await fetch(`${MIRROR_API_URL}/api/catalog/posts`).catch(() => {});
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
      <main className="max-w-6xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8">Creator Studio</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="text-yellow-400" />
                <h2 className="text-2xl font-bold">AI Content Factory</h2>
              </div>
              <DataDashboardButton />
            </div>
            <div className="space-y-4">
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 outline-none"
                placeholder="Topic or Campaign"
                value={cfTopic}
                onChange={e => setCfTopic(e.target.value)}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={cfPlatforms.linkedin} onChange={e => setCfPlatforms(s => ({ ...s, linkedin: e.target.checked }))} />
                  <span>LinkedIn</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="w-4 h-4 accent-pink-500" checked={cfPlatforms.instagram} onChange={e => setCfPlatforms(s => ({ ...s, instagram: e.target.checked }))} />
                  <span>Instagram</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="w-4 h-4 accent-sky-500" checked={cfPlatforms.twitter} onChange={e => setCfPlatforms(s => ({ ...s, twitter: e.target.checked }))} />
                  <span>X/Twitter</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm"
                  value={cfProvider}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'mock' || v === 'dalle' || v === 'stablediffusion' || v === 'midjourney') {
                      setCfProvider(v);
                    }
                  }}
                >
                  <option value="mock">Mock</option>
                  <option value="dalle">DALL·E 3</option>
                  <option value="stablediffusion">Stable Diffusion</option>
                  <option value="midjourney">Midjourney</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="w-4 h-4 accent-green-500" checked={cfSafety} onChange={e => setCfSafety(e.target.checked)} />
                  <span>Safety Filters</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="w-4 h-4 accent-yellow-500" checked={cfAutoSocial} onChange={e => setCfAutoSocial(e.target.checked)} />
                  <span>Auto Social Generator</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={openPreview}
                  disabled={previewLoading || !cfTopic.trim()}
                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${previewLoading || !cfTopic.trim() ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-500'}`}
                >
                  {previewLoading ? 'Preparing Preview...' : 'Preview'}
                </button>
                <button
                  onClick={generateFactoryContent}
                  disabled={cfLoading || !cfTopic.trim()}
                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${cfLoading || !cfTopic.trim() ? 'bg-gray-700 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-500'}`}
                >
                  {cfLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
              {cfError && <div className="text-sm text-red-400">{cfError}</div>}
            </div>
            {previewOpen && (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="preview-title"
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="absolute inset-0 bg-black/70" onClick={closePreview} />
                <div className="relative w-full max-w-4xl rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
                  <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 id="preview-title" className="text-lg font-semibold">Preview</h3>
                    <button
                      onClick={closePreview}
                      className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm"
                    >
                      Back to Edit
                    </button>
                  </div>
                  <div className="max-h-[70vh] overflow-auto p-4">
                    {previewLoading && (
                      <div className="flex items-center justify-center h-48 text-gray-400">
                        <span className="animate-pulse">Loading preview...</span>
                      </div>
                    )}
                    {!previewLoading && previewError && (
                      <div className="text-sm text-red-400">{previewError}</div>
                    )}
                    {!previewLoading && !previewError && previewItems.length > 0 && (
                      <div className="space-y-6">
                        {previewItems.map((item, idx) => (
                          <div key={`preview-${item.platform}-${idx}`} className="rounded-lg border border-gray-700 bg-gray-900">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                              <div className="aspect-video md:aspect-square rounded border border-gray-700 overflow-hidden bg-black/40">
                                <img src={item.image_url} alt="" className="object-contain w-full h-full" />
                              </div>
                              <div className="prose prose-invert max-w-none">
                                <div className="text-sm text-gray-300 font-semibold capitalize mb-2">{item.platform}</div>
                                <div className="text-sm whitespace-pre-wrap">{item.text_content}</div>
                              </div>
                            </div>
                            <div className="px-4 pb-4 text-xs text-gray-400">
                              Provider: {String(item.generation_metadata?.provider)} • Ratio: {String(((item.generation_metadata['image'] as { ratio?: string } | undefined)?.ratio) || '')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {cfItems.length > 0 && (
              <div className="mt-8 space-y-6">
                {cfItems.map((item, idx) => {
                  const score = recommendationScore(item);
                  return (
                    <div key={`${item.platform}-${idx}`} className="rounded-lg border border-gray-700 bg-gray-900 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-gray-300 font-semibold capitalize">{item.platform}</div>
                        <div className="text-xs text-gray-400">Score: {score.toFixed(2)}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="aspect-video md:aspect-square rounded border border-gray-700 overflow-hidden bg-black/40">
                          <img src={item.image_url} alt="" className="object-contain w-full h-full" />
                        </div>
                        <div>
                          <textarea
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 h-40 text-sm"
                            value={item.text_content}
                            onChange={e => updateCfText(idx, e.target.value)}
                          />
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              onClick={() => regenerateImageFor(idx)}
                              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
                            >
                              Regenerate Image
                            </button>
                            <button
                              onClick={() => applyToPoster(idx)}
                              className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-500 text-sm font-semibold"
                            >
                              Apply to Poster
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-400 break-words">
                        Provider: {String(item.generation_metadata?.provider)} • Ratio: {String(((item.generation_metadata['image'] as { ratio?: string } | undefined)?.ratio) || '')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-purple-400" />
              <h2 className="text-2xl font-bold">AI Asset Generator</h2>
            </div>
            
            <div className="space-y-4">
              <textarea 
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-4 h-32 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Describe the image you want to generate..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              <div className="flex items-center justify-between gap-4">
                <label className={`flex items-center gap-2 text-sm p-2 rounded-lg border transition-all cursor-pointer ${quantumMode ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-gray-700 hover:border-gray-600'}`}>
                  <input type="checkbox" className="w-4 h-4 accent-purple-500" checked={quantumMode} onChange={e => setQuantumMode(e.target.checked)} />
                  <span className={quantumMode ? 'text-purple-300 font-semibold' : 'text-gray-300'}>Quantum Mode (Wolfram + Qiskit)</span>
                </label>
                <label className={`flex items-center gap-2 text-sm p-2 rounded-lg border transition-all cursor-pointer ${ipfsEnabled ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-gray-700 hover:border-gray-600'}`}>
                  <input type="checkbox" className="w-4 h-4 accent-green-500" checked={ipfsEnabled} onChange={e => setIpfsEnabled(e.target.checked)} />
                  <span className={ipfsEnabled ? 'text-green-300 font-semibold' : 'text-gray-300'}>IPFS Upload</span>
                </label>
              </div>
              <button 
                onClick={generateImage}
                disabled={isGenerating || !prompt}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${isGenerating || !prompt ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500'}`}
              >
                {isGenerating ? 'Dreaming...' : 'Generate Asset'}
              </button>
            </div>

            <div className="mt-8 w-full flex flex-col gap-4">
              <ImagePreview
                imageUrl={generatedImage || draftImage || undefined}
                isLoading={isGenerating}
                error={generationError}
                metadata={generationMetadata}
                onRetry={generateImage}
                onImport={generatedImage ? handleImportToPoster : undefined}
                importing={importing}
                importProgress={importProgress}
                className="h-[500px]"
              />
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
                    IPFS: {String(generationMetadata.params.ipfs_url)}
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
              onImageGenerated={(url) => setGeneratedImage(url)} 
            />

            <div className="mt-8 border-t border-gray-700 pt-8">
              <h3 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">Latest Drops</h3>
              <div className="aspect-video relative rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
                <LatestAIImage key={lastGenTimestamp} overrideUrl={generatedImage} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-xl border border-gray-700">
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
                <button
                  onClick={() => setTwitterEnabled(v => !v)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${twitterEnabled ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-700'} transition`}
                >Twitter: {twitterEnabled ? 'On' : 'Off'}</button>
                <button
                  onClick={() => setTelegramEnabled(v => !v)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${telegramEnabled ? 'bg-cyan-600 border-cyan-500' : 'bg-gray-800 border-gray-700'} transition`}
                >Telegram: {telegramEnabled ? 'On' : 'Off'}</button>
                <button
                  onClick={() => setInstagramEnabled(v => !v)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${instagramEnabled ? 'bg-pink-600 border-pink-500' : 'bg-gray-800 border-gray-700'} transition`}
                >Instagram: {instagramEnabled ? 'On' : 'Off'}</button>
                <button
                  onClick={() => setTiktokEnabled(v => !v)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${tiktokEnabled ? 'bg-green-600 border-green-500' : 'bg-gray-800 border-gray-700'} transition`}
                >TikTok: {tiktokEnabled ? 'On' : 'Off'}</button>
                <button
                  onClick={() => setYoutubeEnabled(v => !v)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${youtubeEnabled ? 'bg-red-600 border-red-500' : 'bg-gray-800 border-gray-700'} transition`}
                >YouTube: {youtubeEnabled ? 'On' : 'Off'}</button>
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
              <a href={`${process.env.NEXT_PUBLIC_SCREENSHOT_URL || 'http://localhost:4010'}/api/screenshots`} target="_blank" className="text-blue-400 hover:underline mt-2 inline-block">
                Open Screenshot Manager
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
