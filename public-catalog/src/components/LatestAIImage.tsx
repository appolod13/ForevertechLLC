'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, ImageOff } from 'lucide-react';

interface AIImageResponse {
  success: boolean;
  imageUrl: string;
  filename: string;
}

export function LatestAIImage({
  overrideUrl,
  onResolvedUrl,
}: {
  overrideUrl?: string;
  onResolvedUrl?: (url: string | null) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const withCacheBust = (input: string) => {
      if (!input || input.startsWith('data:') || input.startsWith('blob:')) return input;
      try {
        const u = new URL(input, window.location.origin);
        u.searchParams.set('_t', String(Date.now()));
        return u.toString();
      } catch {
        return input;
      }
    };

    const resolveUrl = (input: string) => {
      const s = String(input || '').trim();
      if (!s) return '';
      if (s.startsWith('data:') || s.startsWith('blob:') || s.startsWith('http://') || s.startsWith('https://')) return s;
      try {
        return new URL(s, window.location.origin).toString();
      } catch {
        return '';
      }
    };

    if (overrideUrl) {
      const normalized = resolveUrl(overrideUrl);
      if (normalized) {
        setImageUrl(withCacheBust(normalized));
        setLoading(false);
        setError(false);
      } else {
        setImageUrl(null);
        setLoading(false);
        setError(true);
      }
      return;
    }

    async function fetchImage() {
      try {
        const res = await fetch('/api/latest-ai-image', { cache: 'no-store' }).catch(() => {
          throw new Error('Network error: Failed to fetch');
        });
        if (!res.ok) throw new Error('Failed to fetch');
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format');
        }

        const data: AIImageResponse = await res.json();
        if (data.success && data.imageUrl) {
          const fullUrl = resolveUrl(data.imageUrl);
          if (!fullUrl) throw new Error('Invalid image url');
          setImageUrl(withCacheBust(fullUrl));
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchImage();
  }, [overrideUrl]);

  useEffect(() => {
    onResolvedUrl?.(imageUrl);
  }, [imageUrl, onResolvedUrl]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900/50 p-6 text-zinc-500">
        <ImageOff className="mb-2 h-8 w-8" />
        <span className="text-sm">Latest generation unavailable</span>
      </div>
    );
  }

  return (
    <div className="group relative h-full w-full overflow-hidden bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {imageUrl && (
        <>
          <img
            src={imageUrl}
            alt="Latest AI Generated Content"
            className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700", loading ? "opacity-0" : "opacity-100")}
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
            loading="eager"
          />
        </>
      )}
    </div>
  );
}
