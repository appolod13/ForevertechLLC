
'use client';

import { useState, useRef } from 'react';
import { Sparkles, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface FusionAIProps {
  prompt: string;
  onImageGenerated: (url: string) => void;
}

export function FusionAI({ prompt, onImageGenerated }: FusionAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isFusing, setIsFusing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
    if (files.length === 0 || !prompt) return;

    setIsFusing(true);
    setStatus('Initializing...');
    setProgress(0);
    setError(null);

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('payload', JSON.stringify({ prompt, strength: 0.75, steps: 50 }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const res = await fetch('http://localhost:8000/fuse', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please check if the Fusion service is running.');
        } else if (err.message === 'Failed to fetch') {
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
    const ws = new WebSocket(`ws://localhost:8000/progress/${jobId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data.status);
      setProgress(data.progress);

      if (data.status === 'done') {
        const imageUrl = `http://localhost:8000${data.result}`;
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
                disabled={isFusing || files.length === 0 || !prompt}
                onClick={startFusion}
                className="w-full py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                {isFusing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing Fusion...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Fuse {files.length > 0 ? `${files.length} Image${files.length > 1 ? 's' : ''}` : ''} with Prompt
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
