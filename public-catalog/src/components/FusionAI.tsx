
'use client';

import { useState, useRef } from 'react';
import { Sparkles, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface FusionAIProps {
  prompt: string;
  baseImageUrl?: string | null;
  onImageGenerated: (url: string) => void;
}

export function FusionAI({ prompt, baseImageUrl, onImageGenerated }: FusionAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isFusing, setIsFusing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [useUploadedOnly, setUseUploadedOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const addFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(file => {
      const isValidSize = file.size <= 20 * 1024 * 1024;
      const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      return isValidSize && isValidType;
    });

    if (validFiles.length !== selectedFiles.length) {
      setError('Some files were rejected (must be ≤20MB JPG/PNG/WebP)');
    } else {
      setError(null);
    }

    setFiles(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const startFusion = async () => {
    if (files.length === 0) return;

    setIsFusing(true);
    setStatus('Initializing...');
    setProgress(0);
    setError(null);

    if (useUploadedOnly) {
      try {
        setStatus('Processing uploaded image...');
        setProgress(0.15);
        const firstFile = files[0];
        const userBitmap = await createImageBitmap(firstFile);
        const size = 1024;
        
        const out = document.createElement('canvas');
        out.width = size;
        out.height = size;
        const octx = out.getContext('2d');
        if (!octx) throw new Error('canvas_unavailable');
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';

        const printW = Math.round(size * 0.64);
        const printH = Math.round(size * 0.64);
        const px = Math.round((size - printW) / 2);
        const py = Math.round(size * 0.16);

        octx.save();
        clipRoundRect(octx, px, py, printW, printH, Math.round(size * 0.03));
        drawCover(octx, userBitmap, px, py, printW, printH, userBitmap.width, userBitmap.height);
        octx.restore();

        octx.save();
        octx.globalCompositeOperation = 'source-over';
        octx.globalAlpha = 0.22;
        octx.strokeStyle = 'rgba(0,0,0,0.35)';
        octx.lineWidth = Math.max(2, Math.round(size * 0.004));
        octx.beginPath();
        octx.rect(px + 1, py + 1, printW - 2, printH - 2);
        octx.stroke();
        octx.restore();

        const dataUrl = await canvasToDataUrl(out);
        setProgress(1);
        setStatus('done');
        onImageGenerated(dataUrl);
        setIsFusing(false);
        setIsOpen(false);
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to process uploaded image');
        setIsFusing(false);
        return;
      }
    }

    if (!prompt) {
      setError('Please enter a prompt');
      setIsFusing(false);
      return;
    }

    if (!baseImageUrl) {
      setError('Generate an asset first, then add your image to fuse with it.');
      setIsFusing(false);
      return;
    }

    try {
      setStatus('Blending with generated asset...');
      setProgress(0.15);
      const fused = await fuseClientSide({ baseImageUrl, files, prompt });
      setProgress(1);
      setStatus('done');
      onImageGenerated(fused);
      setIsFusing(false);
      setIsOpen(false);
      return;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fusion failed');
    }

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('payload', JSON.stringify({ prompt, strength: 0.75, steps: 50, baseImageUrl }));

    try {
      const res = await fetch('/api/fuse', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Unknown server error' }));
        const errorMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : (errorData.detail ? JSON.stringify(errorData.detail) : `Server returned ${res.status}`);
        throw new Error(errorMessage);
      }
      
      const { jobId } = await res.json();
      connectWebSocket(jobId);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please check if the Fusion service is running.');
        } else if (err.message === 'Failed to fetch' || err.message.includes('network')) {
          setError('Could not connect to Fusion service. Ensure it is running on port 8000.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
      setIsFusing(false);
    }
  };

  const connectWebSocket = (jobId: string) => {
    if (jobId === 'mock-job') {
      setStatus('Simulating Fusion...');
      setProgress(50);
      setTimeout(() => {
        setProgress(100);
        setStatus('done');
        const mockSvg = `data:image/svg+xml;base64,${btoa(
          '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">' +
            '<rect width="100%" height="100%" fill="#1a1a2e"/>' +
            '<text x="50%" y="50%" font-family="system-ui" font-size="24" fill="#60a5fa" text-anchor="middle">' +
              'Mock Fused Image' +
            '</text>' +
            '<text x="50%" y="60%" font-family="system-ui" font-size="16" fill="#9ca3af" text-anchor="middle">' +
              '(Fusion Service Offline)' +
            '</text>' +
          '</svg>'
        )}`;
        onImageGenerated(mockSvg);
        setIsFusing(false);
        setIsOpen(false);
      }, 2000);
      return;
    }
    const ws = new WebSocket(`ws://127.0.0.1:8000/progress/${jobId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data.status);
      setProgress(data.progress);

      if (data.status === 'done') {
        const imageUrl = `http://127.0.0.1:8000${data.result}`;
        onImageGenerated(imageUrl);
        setIsFusing(false);
        setIsOpen(false);
        ws.close();
      } else if (data.status === 'error') {
        const err = data.error;
        setError(typeof err === 'string' ? err : (err ? JSON.stringify(err) : 'Unknown backend error'));
        setIsFusing(false);
        ws.close();
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setIsFusing(false);
    };
  };

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group border border-blue-400/20"
      >
        <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
        Advanced Fusion Extension
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Image Fusion Studio</h3>
                  <p className="text-xs text-gray-400">Fuse your images with AI prompts</p>
                </div>
              </div>
              <button onClick={() => !isFusing && setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {baseImageUrl && (
                <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                    Using Generated Asset
                  </div>
                  <div className="mt-3 aspect-video relative overflow-hidden rounded-lg border border-gray-800 bg-black/40">
                    <img src={normalizeUrl(baseImageUrl)} alt="Generated asset" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500'); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-500'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-500');
                  addFiles(Array.from(e.dataTransfer.files));
                }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                <div className="p-3 bg-gray-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-400" />
                </div>
                <p className="text-sm font-medium text-gray-300">Drag & drop or click to upload</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP (max 20MB per file)</p>
              </div>

              {/* Use Uploaded Only Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-950/40 border border-gray-800 cursor-pointer hover:border-blue-500/30 transition-all">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-blue-500"
                  checked={useUploadedOnly}
                  onChange={(e) => setUseUploadedOnly(e.target.checked)}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Use Uploaded Image Only</p>
                  <p className="text-xs text-gray-500">No AI fusion - use your uploaded image directly</p>
                </div>
              </label>

              {/* Previews */}
              {previews.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 group">
                      <img src={src} alt="Preview" className="object-cover w-full h-full" />
                      {!isFusing && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Progress and Status */}
              {isFusing && (
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-500">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-500 ease-out"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                disabled={isFusing || files.length === 0 || (!useUploadedOnly && (!prompt || !baseImageUrl))}
                onClick={startFusion}
                className="w-full py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                {isFusing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {useUploadedOnly ? 'Processing Image...' : 'Processing Fusion...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {useUploadedOnly 
                      ? 'Use Uploaded Image' 
                      : `Fuse ${files.length > 0 ? `${files.length} Image${files.length > 1 ? 's' : ''}` : ''} with Prompt`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function blobFromDataUrl(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('invalid_data_url');
  const header = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const mimeMatch = header.match(/data:([^;]+);base64/i);
  const mime = mimeMatch?.[1] || 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function normalizeUrl(url: string): string {
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  return new URL(url, window.location.href).toString();
}

async function loadBitmapFromUrl(url: string): Promise<ImageBitmap> {
  const normalized = normalizeUrl(url);
  if (normalized.startsWith('data:')) {
    const blob = blobFromDataUrl(normalized);
    return await createImageBitmap(blob);
  }
  const fetchUrl = (() => {
    try {
      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        const u = new URL(normalized);
        if (u.origin !== window.location.origin) {
          return `/api/proxy-image?url=${encodeURIComponent(normalized)}`;
        }
      }
    } catch {
    }
    return normalized;
  })();
  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`failed_to_fetch_base_image_${res.status}`);
  const blob = await res.blob();
  return await createImageBitmap(blob);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  sw: number,
  sh: number,
) {
  const srcAspect = sw / sh;
  const dstAspect = dw / dh;
  let sx = 0;
  let sy = 0;
  let sww = sw;
  let shh = sh;
  if (srcAspect > dstAspect) {
    sww = sh * dstAspect;
    sx = (sw - sww) / 2;
  } else {
    shh = sw / dstAspect;
    sy = (sh - shh) / 2;
  }
  ctx.drawImage(source, sx, sy, sww, shh, dx, dy, dw, dh);
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  sw: number,
  sh: number,
) {
  const srcAspect = sw / sh;
  const dstAspect = dw / dh;
  let w = dw;
  let h = dh;
  if (srcAspect > dstAspect) {
    h = dw / srcAspect;
  } else {
    w = dh * srcAspect;
  }
  const x = dx + (dw - w) / 2;
  const y = dy + (dh - h) / 2;
  ctx.drawImage(source, x, y, w, h);
}

function clipRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.clip();
}

function makeNoiseCanvas(size: number, seed: number) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const img = ctx.createImageData(size, size);
  let s = seed >>> 0;
  for (let i = 0; i < img.data.length; i += 4) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const v = (s >>> 0) & 0xff;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

async function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob_failed'))), 'image/png');
  });
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_failed'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

async function fuseClientSide({ baseImageUrl, files, prompt }: { baseImageUrl: string; files: File[]; prompt: string }) {
  const size = 1024;
  const baseBitmap = await loadBitmapFromUrl(baseImageUrl);
  const userBitmaps = await Promise.all(files.map(async (f) => await createImageBitmap(f)));

  const design = document.createElement('canvas');
  design.width = size;
  design.height = size;
  const dctx = design.getContext('2d');
  if (!dctx) throw new Error('canvas_unavailable');
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = 'high';

  drawCover(dctx, baseBitmap, 0, 0, size, size, baseBitmap.width, baseBitmap.height);

  const baseAlpha = userBitmaps.length <= 1 ? 0.62 : 0.45;
  for (let i = 0; i < userBitmaps.length; i++) {
    const bm = userBitmaps[i];
    dctx.save();
    dctx.globalAlpha = baseAlpha * (0.92 ** i);
    dctx.globalCompositeOperation = i === 0 ? 'overlay' : 'soft-light';
    const pad = size * 0.08;
    drawContain(dctx, bm, pad, pad, size - pad * 2, size - pad * 2, bm.width, bm.height);
    dctx.restore();
  }

  const seed = (() => {
    let h = 2166136261;
    for (let i = 0; i < prompt.length; i++) h = (h ^ prompt.charCodeAt(i)) * 16777619;
    return h >>> 0;
  })();

  const noise = makeNoiseCanvas(160, seed);
  dctx.save();
  dctx.globalAlpha = 0.18;
  dctx.globalCompositeOperation = 'soft-light';
  drawCover(dctx, noise, 0, 0, size, size, noise.width, noise.height);
  dctx.restore();

  dctx.save();
  dctx.globalCompositeOperation = 'multiply';
  dctx.globalAlpha = 0.14;
  const grad = dctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.6, 'rgba(235,235,235,1)');
  grad.addColorStop(1, 'rgba(210,210,210,1)');
  dctx.fillStyle = grad;
  dctx.fillRect(0, 0, size, size);
  dctx.restore();

  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('canvas_unavailable');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';

  const printW = Math.round(size * 0.64);
  const printH = Math.round(size * 0.64);
  const px = Math.round((size - printW) / 2);
  const py = Math.round(size * 0.16);

  octx.save();
  clipRoundRect(octx, px, py, printW, printH, Math.round(size * 0.03));
  drawCover(octx, design, px, py, printW, printH, size, size);
  octx.restore();

  octx.save();
  octx.globalCompositeOperation = 'source-over';
  octx.globalAlpha = 0.22;
  octx.strokeStyle = 'rgba(0,0,0,0.35)';
  octx.lineWidth = Math.max(2, Math.round(size * 0.004));
  octx.beginPath();
  octx.rect(px + 1, py + 1, printW - 2, printH - 2);
  octx.stroke();
  octx.restore();

  return await canvasToDataUrl(out);
}
