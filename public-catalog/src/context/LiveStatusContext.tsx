
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { MIRROR_API_URL } from '@/lib/utils';

// Define a type for the post structure (aligned with CatalogItem props)
export interface LivePost {
  id: string;
  content: string;
  metadata?: {
    mediaUrl?: string;
    [key: string]: unknown;
  };
  ipfsHash?: string;
  timestamp?: string;
  date?: string;
}

interface LiveStatusContextType {
  isConnected: boolean;
  lastUpdate: Date | null;
  latestPost: LivePost | null;
}

const LiveStatusContext = createContext<LiveStatusContextType>({
  isConnected: false,
  lastUpdate: null,
  latestPost: null,
});

export function useLiveStatus() {
  return useContext(LiveStatusContext);
}

interface LiveStatusProviderProps {
  children: ReactNode;
}

export function LiveStatusProvider({ children }: LiveStatusProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [latestPost, setLatestPost] = useState<LivePost | null>(null);
  const errorCountRef = useRef(0);
  const visibleRef = useRef<boolean>(true);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const baseUrl = process.env.NEXT_PUBLIC_EVENTS_URL || `${MIRROR_API_URL}/api/events`;

    const connect = () => {
      // Connect to SSE (only in browser environment)
      if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
        return;
      }
      if (!visibleRef.current) {
        return;
      }

      eventSource = new EventSource(baseUrl, { withCredentials: false });

      eventSource.onopen = () => {
        setIsConnected(true);
        errorCountRef.current = 0;
      };

      eventSource.onmessage = () => {
        // Fallback handler for unnamed events
        setLastUpdate(new Date());
      };

      eventSource.addEventListener('connected', () => {
        setIsConnected(true);
        setLastUpdate(new Date());
      });

      eventSource.addEventListener('ping', () => {
        setLastUpdate(new Date());
      });

      eventSource.addEventListener('new_post', (e: MessageEvent) => {
        try {
          const newPost = JSON.parse(e.data);
          setLatestPost(newPost);
          setLastUpdate(new Date());
        } catch (_) {
          // Ignore parse errors silently to prevent noisy logs in dev
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        errorCountRef.current += 1;
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Exponential backoff with max 30s
        const delay = Math.min(30000, 5000 * Math.max(1, errorCountRef.current + 1));
        if (visibleRef.current) {
          retryTimeout = setTimeout(connect, delay);
        }
      };
    };

    const onVisibility = () => {
      const v = document.visibilityState === 'visible';
      visibleRef.current = v;
      if (!v) {
        if (retryTimeout) {
          clearTimeout(retryTimeout);
          retryTimeout = null;
        }
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        setIsConnected(false);
      } else {
        connect();
      }
    };

    onVisibility();
    window.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    window.addEventListener('blur', onVisibility);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('blur', onVisibility);
    };
  }, []); 

  return (
    <LiveStatusContext.Provider value={{ isConnected, lastUpdate, latestPost }}>
      {children}
    </LiveStatusContext.Provider>
  );
}
