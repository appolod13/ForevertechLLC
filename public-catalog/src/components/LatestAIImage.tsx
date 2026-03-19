'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn, MIRROR_API_URL } from '@/lib/utils';
import { Loader2, ImageOff, ShoppingBag } from 'lucide-react';

interface AIImageResponse {
  success: boolean;
  imageUrl: string;
  filename: string;
}

export function LatestAIImage({ overrideUrl }: { overrideUrl?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (overrideUrl) {
      const normalized =
        overrideUrl.startsWith("http") || overrideUrl.startsWith("data:")
          ? overrideUrl
          : `${MIRROR_API_URL}${overrideUrl.startsWith("/") ? overrideUrl : `/${overrideUrl}`}`;
      setImageUrl(normalized);
      setLoading(false);
      setError(false);
      return;
    }

    async function fetchImage() {
      try {
        const res = await fetch(`${MIRROR_API_URL}/api/latest-ai-image`);
        if (!res.ok) throw new Error('Failed to fetch');
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format');
        }

        const data: AIImageResponse = await res.json();
        if (data.success && data.imageUrl) {
          // Ensure the URL is absolute or properly proxied
          const fullUrl = data.imageUrl.startsWith('http') 
            ? data.imageUrl 
            : `${MIRROR_API_URL}${data.imageUrl}`;
          setImageUrl(fullUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error loading AI image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchImage();
  }, [overrideUrl]);

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
          <Image
            src={imageUrl}
            alt="Latest AI Generated Content"
            fill
            className={cn(
              "object-cover transition-opacity duration-700",
              loading ? "opacity-0" : "opacity-100"
            )}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
            priority
          />
          {!loading && (
            <div className="absolute bottom-0 left-0 right-0 translate-y-full transform bg-black/70 p-4 backdrop-blur-sm transition-transform duration-300 group-hover:translate-y-0">
              <Link 
                href={`/customize?imageUrl=${encodeURIComponent(imageUrl)}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                <ShoppingBag className="h-4 w-4" />
                Customize Product
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
