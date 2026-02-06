
import React, { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ShoppingCart, Coins, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

export interface CatalogItemProps {
  id: string;
  content: string;
  mediaUrl?: string | null;
  ipfsHash?: string | null;
  timestamp: string;
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };
  priceUsd?: number;
}

export function CatalogItem({ 
  id,
  content, 
  mediaUrl, 
  ipfsHash, 
  timestamp, 
  metadata,
  priceUsd = ((): number => {
    const m = metadata as { priceUsd?: number } | undefined;
    return typeof m?.priceUsd === 'number' ? m!.priceUsd! : 49.99;
  })()
}: CatalogItemProps) {
  const fcPrice = (priceUsd * 10).toFixed(0); // Mock conversion 1 USD = 10 FC
  const { addToCart } = useCart();
  
  // Handle image URL
  const getImageUrl = (url?: string | null) => {
    if (!url) return '/placeholder-future-city.svg';
    if (url.startsWith('http')) return url;
    if (url.startsWith('Qm') || url.startsWith('bafy')) return `https://ipfs.io/ipfs/${url}`;
    return `http://localhost:3001${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const [imgSrc, setImgSrc] = React.useState(getImageUrl(mediaUrl));
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  React.useEffect(() => {
    setImgSrc(getImageUrl(mediaUrl));
    setIsLoading(true);
    setHasError(false);
  }, [mediaUrl]);

  // Truncate content
  const safeContent = content || '';
  const description = safeContent.length > 200 
    ? safeContent.substring(0, 200) + '...' 
    : safeContent;

  const [isPurchasing, setIsPurchasing] = React.useState(false);

  const handlePurchase = async (currency: 'usd' | 'fc') => {
    setIsPurchasing(true);
    try {
      await addToCart({ 
        id, 
        title: metadata?.title || 'Digital Asset', 
        price: priceUsd,
        quantity: 1,
        currency,
        imageUrl: hasError ? undefined : imgSrc,
        description: safeContent,
        imageError: hasError,
        originalPrompt: String(metadata?.prompt ?? metadata?.title ?? 'Unknown Prompt'),
        originalFilename: mediaUrl || 'Unknown File',
        metadata: {
          ...metadata,
          imageError: hasError,
          originalPrompt: metadata?.prompt || metadata?.title || 'Unknown Prompt'
        }
      });
      toast.success(`Added to cart! (${currency.toUpperCase()})`);
      
    } catch (e) {
      console.error('Purchase error:', e);
      toast.error('Failed to add to cart.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02, translateY: -5 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300"
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950">
        {isLoading && (
          <div className="absolute inset-0 animate-pulse bg-zinc-800" />
        )}
        
        {!hasError ? (
          <Image
            src={imgSrc}
            alt="Item thumbnail"
            fill
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-110",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
              // Log error to backend
              fetch('http://localhost:3001/api/log/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'IMAGE_LOAD_FAILURE',
                  message: `Failed to load image for item ${id}`,
                  details: { mediaUrl, filename: mediaUrl, prompt: metadata?.prompt || metadata?.title }
                })
              }).catch(console.error);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 p-4 text-center">
            <AlertTriangle className="mb-2 h-8 w-8 text-amber-500" />
            <p className="text-xs font-medium text-zinc-400 mb-1">Image Unavailable</p>
            <p className="text-[10px] text-zinc-600 font-mono break-all line-clamp-2">
              Prompt: {String(metadata?.prompt ?? metadata?.title ?? 'Unknown')}
            </p>
            <p className="text-[10px] text-zinc-700 font-mono break-all mt-1">
              File: {mediaUrl}
            </p>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10">
            {(() => {
              try {
                const date = new Date(timestamp);
                return !isNaN(date.getTime()) ? format(date, 'MMM d, yyyy') : 'Recent';
              } catch {
                return 'Recent';
              }
            })()}
          </span>
        </div>
        {ipfsHash && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-200 backdrop-blur-md border border-blue-500/30">
              <ShieldCheck className="mr-1 h-3 w-3" />
              IPFS Verified
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4">
          <h3 className="mb-2 text-xl font-bold text-white line-clamp-1">
            {metadata?.title || 'Exclusive Digital Asset'}
          </h3>
          <p className="text-sm text-zinc-400 line-clamp-3">
            {description}
          </p>
        </div>

        {/* Pricing */}
        <div className="mt-auto space-y-4">
          <div className="flex items-end justify-between border-t border-zinc-800 pt-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Price</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">${priceUsd.toFixed(2)}</span>
                <span className="text-sm text-zinc-500">USD</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-amber-500 uppercase tracking-wider">FC Price</p>
              <div className="flex items-baseline gap-1 justify-end">
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="text-xl font-bold text-amber-400">{fcPrice}</span>
                <span className="text-xs text-amber-500">FC</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handlePurchase('usd')}
              disabled={isPurchasing}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="buy-usd"
            >
              {isPurchasing ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" /> : <ShoppingCart className="h-4 w-4" />}
              Buy Crypto
            </button>
            <button 
              onClick={() => handlePurchase('fc')}
              disabled={isPurchasing}
              className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="buy-fc"
            >
              {isPurchasing ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" /> : <Coins className="h-4 w-4" />}
              Buy w/ FC
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
