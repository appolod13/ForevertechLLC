
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ShoppingCart, ShieldCheck, AlertTriangle, ThumbsUp, ThumbsDown, Eye } from 'lucide-react';
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
  const { addToCart } = useCart();

  const stableNumber = (input: string, min: number, max: number) => {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const span = Math.max(1, max - min + 1);
    return min + ((h >>> 0) % span);
  };
  
  // Handle image URL
  const getImageUrl = (url?: string | null) => {
    if (!url) return '/placeholder-future-city.svg';
    if (url.startsWith('http')) {
      try {
        const u = new URL(url);
        if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.port === '5328' && u.pathname.startsWith('/images/')) {
          const filename = u.pathname.split('/').pop() || '';
          return filename ? `/api/images/${encodeURIComponent(filename)}` : '/placeholder-future-city.svg';
        }
      } catch {
      }
      return url;
    }
    if (url.startsWith('Qm') || url.startsWith('bafy')) return `https://ipfs.io/ipfs/${url}`;
    return `${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const [imgSrc, setImgSrc] = React.useState(getImageUrl(mediaUrl));
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [likes, setLikes] = useState(() => stableNumber(`likes|${id}`, 10, 59));
  const [isLiked, setIsLiked] = useState(false);
  const [dislikeTime, setDislikeTime] = useState<number | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSize, setSelectedSize] = useState<'S'|'M'|'L'|'XL'|'XXL'>('L');

  useEffect(() => {
    // Check if it was disliked more than 30 mins ago
    if (dislikeTime) {
      const checkHidden = () => {
        if (Date.now() - dislikeTime > 30 * 60 * 1000) {
          setIsHidden(true);
        }
      };
      checkHidden();
      const interval = setInterval(checkHidden, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [dislikeTime]);

  const handleFeedback = async (type: 'like' | 'dislike') => {
    try {
      const prompt = (() => {
        const p = metadata?.prompt ?? metadata?.title;
        return typeof p === 'string' ? p : (p ? JSON.stringify(p) : '');
      })();

      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: id, type, prompt, mediaUrl: mediaUrl || undefined })
      });
      
      if (type === 'like') {
        if (!isLiked) {
          setLikes(prev => prev + 1);
          setIsLiked(true);
          toast.success('You liked this design! The AI will learn from this.');
        }
      } else {
        setDislikeTime(Date.now());
        toast.info('You disliked this design. It will be hidden in 30 minutes.');
      }
    } catch (e) {
      console.error('Feedback error:', e);
    }
  };

  React.useEffect(() => {
    setImgSrc(getImageUrl(mediaUrl));
    setIsLoading(true);
    setHasError(false);
  }, [mediaUrl]);

  const [isPurchasing, setIsPurchasing] = React.useState(false);

  // Truncate content
  const safeContent = content || '';
  const description = safeContent.length > 200 
    ? safeContent.substring(0, 200) + '...' 
    : safeContent;

  if (isHidden) return null;

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      await addToCart({ 
        id: `${id}-${selectedSize}`, 
        title: `${metadata?.title || 'Digital Asset'} (Size: ${selectedSize})`, 
        price: priceUsd,
        quantity: 1,
        currency: 'usd',
        size: selectedSize,
        imageUrl: hasError ? undefined : imgSrc,
        description: safeContent,
        imageError: hasError,
        originalPrompt: (() => {
          const p = metadata?.prompt ?? metadata?.title ?? 'Unknown Prompt';
          return typeof p === 'string' ? p : JSON.stringify(p);
        })(),
        originalFilename: mediaUrl || 'Unknown File',
        metadata: {
          ...metadata,
          imageError: hasError,
          originalPrompt: metadata?.prompt || metadata?.title || 'Unknown Prompt'
        }
      });
      toast.success('Added to cart!');
      
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
          <img
            src={imgSrc}
            alt="Item thumbnail"
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
              fetch('/api/log/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'IMAGE_LOAD_FAILURE',
                  message: `Failed to load image for item ${id}`,
                  details: { mediaUrl, filename: mediaUrl, prompt: metadata?.prompt || metadata?.title }
                })
              }).catch(console.error);
            }}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 p-4 text-center">
            <AlertTriangle className="mb-2 h-8 w-8 text-amber-500" />
            <p className="text-xs font-medium text-zinc-400 mb-1">Image Unavailable</p>
            <p className="text-[10px] text-zinc-600 font-mono break-all line-clamp-2">
              Prompt: {(() => {
                const p = metadata?.prompt ?? metadata?.title ?? 'Unknown';
                return typeof p === 'string' ? p : JSON.stringify(p);
              })()}
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
          <div className="flex justify-between items-start">
            <h3 className="mb-2 text-xl font-bold text-white line-clamp-1 flex-1">
              {metadata?.title || 'Exclusive Digital Asset'}
            </h3>
            <button 
              onClick={() => setShowPreview(true)}
              className="ml-2 p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title="Preview Image"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-zinc-400 line-clamp-3">
            {description}
          </p>
        </div>

        {/* Feedback Section */}
        <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-4">
          <button 
            onClick={() => handleFeedback('like')}
            className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors", 
              isLiked ? "bg-primary/20 text-primary" : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>{likes} Likes</span>
          </button>
          <button 
            onClick={() => handleFeedback('dislike')}
            className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
              dislikeTime ? "bg-red-500/20 text-red-500" : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            )}
            title={dislikeTime ? "Will be hidden in 30 mins" : "Dislike to teach AI"}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            <span>Dislike</span>
          </button>
          {dislikeTime && (
            <span className="text-[10px] text-amber-500/80 animate-pulse ml-auto">
              Hiding soon...
            </span>
          )}
        </div>

        {/* Pricing */}
        <div className="mt-auto space-y-4">
          <div className="flex items-end justify-between pt-1">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Price</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">${priceUsd.toFixed(2)}</span>
                <span className="text-sm text-zinc-500">USD</span>
              </div>
            </div>
          </div>

          {/* Size Selector */}
          <div className="mb-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">T-Shirt Size</p>
            <div className="flex gap-2">
              {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size as 'S'|'M'|'L'|'XL'|'XXL')}
                  className={cn(
                    "flex-1 py-1 text-xs font-semibold rounded-md border transition-colors",
                    selectedSize === size 
                      ? "bg-primary border-primary text-black" 
                      : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-primary/50"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="buy-now"
            >
              {isPurchasing ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" /> : <ShoppingCart className="h-4 w-4" />}
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowPreview(false)}>
          <div className="relative max-w-4xl w-full aspect-square md:aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800" onClick={(e) => e.stopPropagation()}>
            <img
              src={imgSrc}
              alt="Preview"
              className="absolute inset-0 h-full w-full object-contain"
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.currentTarget;
                target.src = 'https://via.placeholder.com/400x300?text=Preview+Not+Available';
              }}
              loading="eager"
            />
            <button 
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 h-10 w-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
            >
              &times;
            </button>
            <div className="absolute bottom-4 left-4 bg-black/60 px-4 py-2 rounded-lg text-sm text-white backdrop-blur-md">
              <span className="font-semibold text-primary">{likes} Likes</span> - AI generated
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
