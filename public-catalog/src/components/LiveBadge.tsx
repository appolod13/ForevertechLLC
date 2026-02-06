'use client';

import { useLiveStatus } from '@/context/LiveStatusContext';
import { cn } from '@/lib/utils';

export function LiveBadge() {
  const { isConnected } = useLiveStatus();
  
  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors duration-300",
        isConnected 
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
          : "bg-red-500/10 text-red-400 border-red-500/20"
      )}
      role="status"
      aria-live="polite"
      aria-label={isConnected ? "System Online" : "System Offline"}
    >
      <span className="relative flex h-2 w-2">
        <span className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", 
          isConnected ? "bg-emerald-400" : "bg-red-400"
        )}></span>
        <span className={cn(
          "relative inline-flex h-2 w-2 rounded-full", 
          isConnected ? "bg-emerald-500" : "bg-red-500"
        )}></span>
      </span>
      <span className="hidden sm:inline">
        {isConnected ? 'Live Updates' : 'Connecting...'} 
      </span>
      <span className="sm:hidden">
        {isConnected ? 'Live' : '...'}
      </span>
    </div>
  );
}
