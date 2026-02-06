
'use client';

import React, { useEffect, useState } from 'react';
import { CatalogItem } from './CatalogItem';
import { Filter, Search, Loader2 } from 'lucide-react';
import { useLiveStatus } from '@/context/LiveStatusContext';
import { LiveBadge } from './LiveBadge';

interface Post {
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

interface CatalogGridProps {
  initialPosts: Post[];
}

export function CatalogGrid({ initialPosts }: CatalogGridProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const { latestPost } = useLiveStatus();
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    sort: 'newest' as 'newest' | 'oldest',
    type: 'all' as 'all' | 'image' | 'text'
  });
  const filterRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (latestPost) {
      setPosts(prev => {
        if (prev.find(p => p.id === latestPost.id)) return prev;
        return [latestPost, ...prev];
      });
    }
  }, [latestPost]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Logic
  const filteredPosts = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const tokens = q.length ? q.split(/\s+/).filter(Boolean) : [];
    function textFor(post: Post) {
      const t = [
        post.content || '',
        post.metadata?.title?.toString() || '',
        post.metadata?.description?.toString() || ''
      ].join(' ').toLowerCase();
      return t;
    }
    function score(post: Post) {
      const t = textFor(post);
      if (!q) return 0;
      let s = 0;
      if (t.includes(q)) s += 5;
      for (const token of tokens) {
        if (t.includes(token)) s += 3;
      }
      if (tokens.includes('robot')) {
        const robotHints = ['robot','android','mech','cyborg','bot'];
        if (robotHints.some(h => t.includes(h))) s += 2;
      }
      return s;
    }
    let arr = posts.map(p => ({ post: p, score: score(p) }))
      .filter(({ post, score }) => {
        const t = textFor(post);
        const matches = q ? (t.includes(q) || tokens.some(tok => t.includes(tok))) : true;
        if (!matches) return false;
        if (activeFilters.type === 'image' && !post.metadata?.mediaUrl) return false;
        if (activeFilters.type === 'text' && post.metadata?.mediaUrl) return false;
        return true;
      });
    arr.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const dateA = new Date(a.post.timestamp || a.post.date || 0).getTime();
      const dateB = new Date(b.post.timestamp || b.post.date || 0).getTime();
      return activeFilters.sort === 'newest' ? dateB - dateA : dateA - dateB;
    });
    if (tokens.includes('robot')) {
      const top = arr.slice(0, 3).map(x => x.post);
      const hasRobotToken = top.some(p => {
        const t = textFor(p);
        return t.includes('robot') || t.includes('android') || t.includes('mech') || t.includes('cyborg') || t.includes('bot');
      });
      if (!hasRobotToken) {
        arr = arr.filter(({ post }) => {
          const t = textFor(post);
          return t.includes('robot') || t.includes('android') || t.includes('mech') || t.includes('cyborg') || t.includes('bot');
        });
      }
    }
    return arr.map(x => x.post);
  }, [posts, searchQuery, activeFilters]);

  const activeFilterCount = (activeFilters.sort !== 'newest' ? 1 : 0) + (activeFilters.type !== 'all' ? 1 : 0);

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Controls */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold text-white">Latest Drops</h1>
          <div className="md:hidden">
            <LiveBadge />
          </div>
        </div>
        
        <div className="flex items-center gap-3 z-20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-64"
            />
          </div>
          
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${isFilterOpen || activeFilterCount > 0 ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800'}`}
              aria-expanded={isFilterOpen}
              aria-haspopup="true"
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {isFilterOpen && (
              <div className="absolute right-0 top-12 w-56 rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200 z-50">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sort By</h3>
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white">
                        <input 
                          type="radio" 
                          name="sort" 
                          checked={activeFilters.sort === 'newest'}
                          onChange={() => setActiveFilters(prev => ({ ...prev, sort: 'newest' }))}
                          className="accent-primary"
                        />
                        Newest First
                      </label>
                      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white">
                        <input 
                          type="radio" 
                          name="sort" 
                          checked={activeFilters.sort === 'oldest'}
                          onChange={() => setActiveFilters(prev => ({ ...prev, sort: 'oldest' }))}
                          className="accent-primary"
                        />
                        Oldest First
                      </label>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-800" />

                  <div>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Asset Type</h3>
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white">
                        <input 
                          type="radio" 
                          name="type" 
                          checked={activeFilters.type === 'all'}
                          onChange={() => setActiveFilters(prev => ({ ...prev, type: 'all' }))}
                          className="accent-primary"
                        />
                        All Assets
                      </label>
                      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white">
                        <input 
                          type="radio" 
                          name="type" 
                          checked={activeFilters.type === 'image'}
                          onChange={() => setActiveFilters(prev => ({ ...prev, type: 'image' }))}
                          className="accent-primary"
                        />
                        Images Only
                      </label>
                      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white">
                        <input 
                          type="radio" 
                          name="type" 
                          checked={activeFilters.type === 'text'}
                          onChange={() => setActiveFilters(prev => ({ ...prev, type: 'text' }))}
                          className="accent-primary"
                        />
                        Text Only
                      </label>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setActiveFilters({ sort: 'newest', type: 'all' });
                      setSearchQuery('');
                      setIsFilterOpen(false);
                    }}
                    className="w-full rounded bg-zinc-800 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredPosts.map((post, index) => (
          <CatalogItem
            key={post.id || `post-${index}`}
            id={post.id || `post-${index}`}
            content={post.content}
            mediaUrl={post.metadata?.mediaUrl}
            ipfsHash={post.ipfsHash}
            timestamp={post.timestamp || post.date || new Date().toISOString()}
            metadata={post.metadata}
          />
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-zinc-500" />
          <p className="text-zinc-400">
            {posts.length === 0 ? "Loading catalog..." : "No assets found matching your filters."}
          </p>
          {posts.length > 0 && (
             <button 
               onClick={() => { setSearchQuery(''); setActiveFilters({ sort: 'newest', type: 'all' }); }}
               className="mt-4 text-sm text-primary hover:underline"
             >
               Clear all filters
             </button>
          )}
        </div>
      )}
    </main>
  );
}
