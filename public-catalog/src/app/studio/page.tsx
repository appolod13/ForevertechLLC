'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { DataDashboardButton } from '../../components/DataDashboardButton';
import { FusionAI } from '../../components/FusionAI';
import { LatestAIImage } from '../../components/LatestAIImage';
import { MerchPreviewPanel } from '../../components/MerchPreviewPanel';
import { Sparkles } from 'lucide-react';
import { buildQuantumSourceLinks, getCreatorAccess } from '@/lib/creatorAccess';
import {
  saveStoredGeneration,
  upsertSourceRecord,
  type SourceRecordLike,
  type SourceRecordLike,
  type StoredGenerationRecord,
} from '@/lib/creatorArtifacts';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isFallbackImageUrl(value: string | null | undefined) {
  const url = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return url.startsWith('data:image/svg+xml');
}

function pickPreferredImageUrl(primary: string | null | undefined, secondary: string | null | undefined) {
  const first = typeof primary === 'string' ? primary.trim() : '';
  const second = typeof secondary === 'string' ? secondary.trim() : '';
  if (first && !isFallbackImageUrl(first)) return first;
  if (second && !isFallbackImageUrl(second)) return second;
  return first || second || null;
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
  const [generatedImage, setGeneratedImage] = useState('');
  const [latestDropImageUrl, setLatestDropImageUrl] = useState<string | null>(null);
  const [generatedTextContent, setGeneratedTextContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationAttempt, setGenerationAttempt] = useState(0);
  const [generationMetadata, setGenerationMetadata] = useState<{
    timestamp: string;
    model: string;
    params: Record<string, unknown>;
  } | undefined>(undefined);
  const [ipfsEnabled, setIpfsEnabled] = useState<boolean>(false);
  const [quantumMode, setQuantumMode] = useState<boolean>(false);
  const [quantumUnlocked, setQuantumUnlocked] = useState<boolean>(false);
  const [quantumRecord, setQuantumRecord] = useState<{
    id: string;
    createdAt: string;
    prompt: string;
    imageUrl: string;
    model: string;
    metadata: Record<string, unknown>;
  } | null>(null);
  const [lastGenTimestamp, setLastGenTimestamp] = useState<number>(Date.now());

  const [pipelineStage, setPipelineStage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [generationMaxAttempts, setGenerationMaxAttempts] = useState<number>(10);
  const [logs, setLogs] = useState<
    { time: string; msg: string; code?: string; type: 'info' | 'error' | 'warn' | 'success' }[]
  >([]);
  const previewImageUrl = useMemo(() => pickPreferredImageUrl(generatedImage, latestDropImageUrl), [generatedImage, latestDropImageUrl]);

  const addLog = (msg: string, type: 'info' | 'error' | 'warn' | 'success' = 'info', code?: string) => {
    const t = new Date();
    const time = t.toISOString().split('T')[1]?.slice(0, 8) || t.toISOString();
    setLogs((prev) => [...prev, { time, msg, type, code }]);
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!scannedBackText) return;
    setGeneratedTextContent(scannedBackText);
    addLog(`Scanned back text: ${scannedBackText}`, 'success', 'qr_scan');
  }, [hydrated, scannedBackText]);

  useEffect(() => {
    if (!hydrated) return;
    if (!sharedImage && !sharedText && !sharedPrompt) return;
    if (sharedImage) {
      setGeneratedImage((prev) => prev || sharedImage);
    }
    if (sharedText) {
      setGeneratedTextContent((prev) => (prev && prev.trim() ? prev : sharedText));
    }
    if (sharedPrompt) {
      setPrompt((prev) => (prev && prev.trim() ? prev : sharedPrompt));
    }
    addLog('Imported shared item into Studio', 'success', 'share_in');
  }, [hydrated, sharedImage, sharedPrompt, sharedText]);

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

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-hydrated={hydrated ? '1' : '0'}>
      <Header />
      <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Creator Studio</h1>
        
        <div className="grid grid-cols-1 gap-6 md:gap-12">
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
                  Earn 75% on creator-linked sales, unlock QR selling, and expand storage for your images, seeds, math, code, and source records.
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
              {generationError ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {generationError}
                </div>
              ) : null}
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
                  onResolvedUrl={(url) => {
                    setLatestDropImageUrl((prev) => pickPreferredImageUrl(generatedImage, url) || pickPreferredImageUrl(generatedImage, prev));
                  }}
                />
              </div>
              {previewImageUrl ? (
                <div className="mt-5 rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="mb-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Finished Product</div>
                    <div className="mt-2 text-sm text-zinc-400">
                      See how the latest generation looks as a buyer-ready shirt before opening the full merch editor.
                    </div>
                  </div>
                  <MerchPreviewPanel
                    imageUrl={previewImageUrl}
                    prompt={(prompt || generatedTextContent).trim()}
                    productName="Premium Tee"
                    printType="standard"
                    enablePrintifyMockups
                  />
                </div>
              ) : null}
              {previewImageUrl ? (
                <Link
                  href={`/customize?imageUrl=${encodeURIComponent(previewImageUrl)}${
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
