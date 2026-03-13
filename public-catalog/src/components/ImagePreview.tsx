'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2, Download, ZoomIn, ZoomOut, Loader2, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { Loader2 as Spinner } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePreviewProps {
  imageUrl?: string;
  isLoading: boolean;
  error?: string | null;
  metadata?: {
    timestamp: string;
    model: string;
    params: Record<string, unknown>;
  };
  onRetry?: () => void;
  className?: string;
  onImport?: () => void;
  importing?: boolean;
  importProgress?: number;
}

export function ImagePreview({
  imageUrl,
  isLoading,
  error,
  metadata,
  onRetry,
  className,
  onImport,
  importing = false,
  importProgress = 0
}: ImagePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = imageUrl.split('.').pop()?.split('?')[0] || 'png';
      a.download = `generated-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download failed', e);
      alert('Failed to download image. It might be blocked by CORS.');
    }
  };

  return (
    <div 
      key={imageUrl || 'empty'}
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden bg-black/90 rounded-xl border border-gray-700 flex flex-col",
        isFullscreen ? "h-screen rounded-none border-none" : "h-[512px]",
        className
      )}
    >
      <div className="flex-1 relative w-full h-full overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 text-purple-400">
            <Loader2 className="w-12 h-12 animate-spin" />
            <span className="animate-pulse font-medium">Generating your masterpiece...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 text-red-400 p-8 text-center">
            <AlertCircle className="w-12 h-12" />
            <p className="font-medium">{error}</p>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors mt-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}
          </div>
        ) : imageUrl ? (
          <div 
            className="relative transition-transform duration-200 ease-out"
            style={{ 
              transform: `scale(${zoom})`,
              width: '100%',
              height: '100%'
            }}
          >
            <Image
              src={imageUrl}
              alt="Generated Asset"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="text-gray-500 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 opacity-50" />
            </div>
            <p>Ready to generate</p>
          </div>
        )}

        {imageUrl && showMetadata && metadata && (
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm p-4 rounded-lg border border-gray-700 max-w-xs text-xs space-y-2 z-20">
            <h4 className="font-bold text-gray-200 border-b border-gray-700 pb-1 mb-2">Generation Metadata</h4>
            <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-gray-300">
              <span className="text-gray-500">Time:</span>
              <span>{new Date(metadata.timestamp).toLocaleTimeString()}</span>
              
              <span className="text-gray-500">Model:</span>
              <span>{metadata.model}</span>
              
              {Object.entries(metadata.params).map(([key, value]) => (
                <div key={key} className="contents">
                  <span className="text-gray-500 capitalize">{key}:</span>
                  <span className="truncate">
                    {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' 
                      ? String(value) 
                      : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {imageUrl && (
          <button
            disabled={isLoading || importing}
            onClick={onImport}
            className={cn(
              "absolute bottom-4 right-4 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2",
              isLoading || importing ? "opacity-50 cursor-not-allowed" : "hover:brightness-110",
            )}
            style={{ backgroundColor: '#2A5C8B', color: '#fff', borderRadius: 8 }}
          >
            {importing ? (
              <>
                <Spinner className="h-4 w-4 animate-spin" />
                {`${Math.min(100, Math.max(0, Math.round(importProgress)))}%`}
              </>
            ) : (
              "Import to Multi-Channel Poster"
            )}
          </button>
        )}
      </div>

      <div className="h-14 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2">
          {imageUrl && (
            <>
              <button 
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-2 hover:bg-gray-800 rounded-lg disabled:opacity-50 text-gray-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button 
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-2 hover:bg-gray-800 rounded-lg disabled:opacity-50 text-gray-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {imageUrl && (
            <>
              <button 
                onClick={() => setShowMetadata(!showMetadata)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  showMetadata ? "bg-purple-500/20 text-purple-400" : "hover:bg-gray-800 text-gray-300"
                )}
                title="Toggle Metadata"
              >
                <Info className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDownload}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-300 transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
            </>
          )}
          <button 
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-300 transition-colors ml-2 border-l border-gray-700 pl-4"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
