
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { DataDashboardButton } from '../../components/DataDashboardButton';
import { FusionAI } from '../../components/FusionAI';
import { Image as ImageIcon, Send, Sparkles } from 'lucide-react';
import styles from './page.module.css';

import { MIRROR_API_URL } from '@/lib/utils';

export default function StudioPage() {
  const searchParams = useSearchParams();
  const testMode = (searchParams?.get('test') || '') === '1';
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
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
  const [quantumMode, setQuantumMode] = useState<boolean>(true);
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

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch(`${MIRROR_API_URL}/api/catalog/posts`, { cache: 'no-store' });
        const data = await res.json();
        const items = Array.isArray(data.posts) ? data.posts : [];
        setCatalogPosts(items.map((p: any) => ({ id: String(p.id || Math.random()), content: String(p.content || '') })));
      } catch {
        try {
          const res = await fetch('/api/catalog/posts', { cache: 'no-store' });
          const data = await res.json();
          const items = Array.isArray(data.posts) ? data.posts : [];
          setCatalogPosts(items.map((p: any) => ({ id: String(p.id || Math.random()), content: String(p.content || '') })));
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

  const generateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedImage('');
    try {
      const endpoint = testMode
        ? '/api/generate/image'
        : (quantumMode ? `${MIRROR_API_URL}/api/generate-quantum-image` : `${MIRROR_API_URL}/api/generate-image`);
      const payload = quantumMode ? { query: prompt, width: 512, height: 512, pattern: 'wolfram', colormap: 'plasma' } : { prompt, width: 512, height: 512 };
      const start = Date.now();
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        const imageUrl = data.imageUrl || data.image_url;
        const url = typeof imageUrl === 'string' && imageUrl.startsWith('http')
          ? imageUrl
          : (testMode ? String(imageUrl || '') : `${MIRROR_API_URL}${imageUrl || ''}`);
        setGeneratedImage(url);
        setGenerationMetadata({
          timestamp: new Date().toISOString(),
          model: quantumMode ? 'Quantum-v1 (Wolfram+Qiskit)' : 'Local PyTorch (Diffusers)',
          params: { ...payload, duration: `${Date.now() - start}ms` }
        });
      } else {
        setGenerationError(data.error || 'Generation failed');
      }
    } catch (e) {
      console.error(e);
      setGenerationError('Failed to connect to generation service');
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
    <div className="min-h-screen bg-gray-900 text-white">
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
                  onChange={e => setCfProvider(e.target.value as any)}
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
          {/* AI Generator */}
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
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="w-4 h-4 accent-purple-500" checked={quantumMode} onChange={e => setQuantumMode(e.target.checked)} />
                  <span>Quantum Mode (Wolfram + Qiskit)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="w-4 h-4 accent-green-500" checked={ipfsEnabled} onChange={e => setIpfsEnabled(e.target.checked)} />
                  <span>IPFS Upload</span>
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

            <div className="mt-8 w-full h-[500px]">
              <div className="relative w-full h-full rounded-lg border border-gray-700 bg-gray-900 flex items-center justify-center overflow-hidden">
                {isGenerating && (
                  <div className="text-sm text-gray-400">Generating...</div>
                )}
                {!isGenerating && generationError && (
                  <div className="text-sm text-red-400">{generationError}</div>
                )}
                {!isGenerating && !generationError && generatedImage && (
                  <img src={generatedImage} alt="" className="object-contain w-full h-full" />
                )}
                {!isGenerating && !generationError && !generatedImage && (
                  <div className="text-sm text-gray-400">No image generated yet</div>
                )}
                <div className="absolute bottom-4 right-4">
                  <button
                    className={`px-4 py-2 rounded-lg bg-blue-600 text-white font-bold ${importing || !generatedImage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500'}`}
                    onClick={handleImportToPoster}
                    disabled={importing || !generatedImage}
                    title="Import to Multi-Channel Poster"
                  >
                    {importing ? `${importProgress}%` : 'Import'}
                  </button>
                </div>
              </div>
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
            </div>

            <FusionAI 
              prompt={prompt} 
              onImageGenerated={(url) => setGeneratedImage(url)} 
            />
          </div>

          {/* Multi-Poster */}
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
