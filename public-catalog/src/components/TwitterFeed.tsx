'use client';

import { useEffect, useState } from 'react';
import { Heart, Repeat, MessageCircle, ExternalLink, Twitter } from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

interface TweetMedia {
  type: string;
  url: string;
  width?: number;
  height?: number;
}

interface TweetAuthor {
  name: string;
  username: string;
  profile_image_url: string;
}

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  author: TweetAuthor;
  media: TweetMedia[];
}

function TweetMediaImage({ src, alt, width, height }: { src: string; alt: string; width?: number; height?: number }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs p-4">
        Failed to load image
      </div>
    );
  }

  // Calculate aspect ratio if dimensions exist, default to video (16/9)
  const aspectRatio = width && height ? width / height : 16 / 9;

  return (
    <div 
      className="relative w-full overflow-hidden bg-gray-900 rounded-lg"
      style={{ aspectRatio: `${aspectRatio}` }}
    >
      {isLoading && <div className="absolute inset-0 animate-pulse bg-gray-800" />}
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        sizes="(max-width: 768px) 100vw, 600px"
      />
    </div>
  );
}

function TweetAvatar({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
        <span className="text-sm font-bold">{alt?.[0] || 'A'}</span>
      </div>
    );
  }

  return (
    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-800">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
        sizes="40px"
      />
    </div>
  );
}

export function TwitterFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTweets = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/twitter/feed');
        if (!response.ok) {
          throw new Error('Failed to fetch tweets');
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format');
        }

        const data = await response.json();
        if (data.success) {
          setTweets(data.tweets);
        } else {
          setError(data.error || 'Failed to load tweets');
        }
      } catch (err) {
        console.error('Error fetching tweets:', err);
        setError('Could not load Twitter feed');
      } finally {
        setLoading(false);
      }
    };

    fetchTweets();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex space-x-4">
              <div className="rounded-full bg-gray-800 h-12 w-12"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 text-center bg-gray-900/50 rounded-xl border border-red-900/30">
        <Twitter className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">{error}</p>
        <p className="text-sm text-gray-600 mt-2">Make sure the backend is running and Twitter API credentials are set.</p>
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 text-center bg-gray-900/50 rounded-xl border border-gray-800">
        <Twitter className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <p className="text-gray-400">No tweets found yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Twitter className="w-6 h-6 text-[#1DA1F2]" fill="currentColor" />
          Latest Updates
        </h2>
        <a 
          href="https://twitter.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-[#1DA1F2] hover:underline flex items-center gap-1"
        >
          View on X <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {tweets.map((tweet) => (
        <article 
          key={tweet.id} 
          className="bg-black hover:bg-gray-900/30 transition-colors border border-gray-800 rounded-xl p-4 overflow-hidden"
        >
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <TweetAvatar 
                src={tweet.author?.profile_image_url} 
                alt={tweet.author?.name} 
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white truncate">{tweet.author?.name}</span>
                <span className="text-gray-500 text-sm truncate">@{tweet.author?.username}</span>
                <span className="text-gray-500 text-sm">·</span>
                <time className="text-gray-500 text-sm hover:underline" dateTime={tweet.created_at}>
                  {formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true })}
                </time>
              </div>

              <p className="text-white text-[15px] leading-normal whitespace-pre-wrap mb-3">
                {tweet.text}
              </p>

              {tweet.media && tweet.media.length > 0 && (
                <div className={`grid gap-2 mb-3 ${tweet.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {tweet.media.map((m, idx) => (
                    <div key={idx} className="relative rounded-2xl overflow-hidden border border-gray-800">
                      {m.type === 'video' || m.type === 'animated_gif' ? (
                        <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
                          {m.url ? (
                             <TweetMediaImage src={m.url} alt="Media content" width={m.width} height={m.height} />
                          ) : (
                            <div className="text-gray-500 text-sm">Video Preview</div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-blue-500/90 flex items-center justify-center">
                              <div className="w-0 h-0 border-t-6 border-t-transparent border-l-10 border-l-white border-b-6 border-b-transparent ml-1"></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <TweetMediaImage 
                          src={m.url} 
                          alt="Tweet media" 
                          width={m.width} 
                          height={m.height} 
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-gray-500 max-w-md mt-2">
                <button className="flex items-center gap-2 group hover:text-blue-400 transition-colors text-sm">
                  <div className="p-2 rounded-full group-hover:bg-blue-400/10 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span>{tweet.metrics?.reply_count || 0}</span>
                </button>
                <button className="flex items-center gap-2 group hover:text-green-400 transition-colors text-sm">
                  <div className="p-2 rounded-full group-hover:bg-green-400/10 transition-colors">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <span>{tweet.metrics?.retweet_count || 0}</span>
                </button>
                <button className="flex items-center gap-2 group hover:text-pink-500 transition-colors text-sm">
                  <div className="p-2 rounded-full group-hover:bg-pink-500/10 transition-colors">
                    <Heart className="w-4 h-4" />
                  </div>
                  <span>{tweet.metrics?.like_count || 0}</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
