'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildPosterPlatformStates,
  isRecord,
  POSTER_PLATFORM_NAMES,
  type PosterPlatformKey,
  type PosterPlatformState,
} from '@/lib/multiposter';

type MultiPosterPanelProps = {
  initialImageUrl?: string;
  initialText?: string;
  initialPrompt?: string;
};

const PLATFORM_ORDER: PosterPlatformKey[] = [
  'twitter',
  'telegram',
  'instagram',
  'tiktok',
  'youtube',
  'reddit',
  'discord',
  'rss',
];

const PLATFORM_BUTTON_CLASSES: Record<PosterPlatformKey, string> = {
  twitter: 'bg-sky-500 hover:bg-sky-400',
  telegram: 'bg-sky-600 hover:bg-sky-500',
  instagram: 'bg-pink-600 hover:bg-pink-500',
  tiktok: 'bg-black hover:bg-zinc-900',
  youtube: 'bg-red-600 hover:bg-red-500',
  reddit: 'bg-orange-600 hover:bg-orange-500',
  discord: 'bg-indigo-500 hover:bg-indigo-400',
  rss: 'bg-amber-500 hover:bg-amber-400 text-zinc-950',
};

function emptyPlatformStates(): Record<PosterPlatformKey, PosterPlatformState> {
  return {
    twitter: { status: 'needs_connection', label: 'Twitter needs connection', authenticated: false },
    telegram: { status: 'needs_connection', label: 'Telegram needs connection', authenticated: false },
    instagram: { status: 'needs_connection', label: 'Instagram needs connection', authenticated: false },
    tiktok: { status: 'needs_connection', label: 'TikTok needs connection', authenticated: false },
    youtube: { status: 'needs_connection', label: 'YouTube needs connection', authenticated: false },
    reddit: { status: 'needs_connection', label: 'Reddit needs connection', authenticated: false },
    discord: { status: 'needs_connection', label: 'Discord needs connection', authenticated: false },
    rss: { status: 'warning', label: 'RSS unavailable', authenticated: false },
  };
}

function emptyPlatformSelection(): Record<PosterPlatformKey, boolean> {
  return {
    twitter: false,
    telegram: false,
    instagram: false,
    tiktok: false,
    youtube: false,
    reddit: false,
    discord: false,
    rss: false,
  };
}

function getPlatformButtonLabel(platform: PosterPlatformKey, state: PosterPlatformState) {
  if (state.authenticated) {
    if (platform === 'rss') return '@RSS feed';
    return platform === 'discord' ? 'Connected' : `Connected ${POSTER_PLATFORM_NAMES[platform]}`;
  }

  switch (platform) {
    case 'twitter':
      return 'Sign in to Twitter';
    case 'telegram':
      return 'Configure Telegram';
    case 'instagram':
      return 'Sign in to Instagram';
    case 'tiktok':
      return 'Sign in to TikTok';
    case 'youtube':
      return 'Sign in to YouTube';
    case 'reddit':
      return 'Sign in to Reddit';
    case 'discord':
      return 'Configure Discord';
    case 'rss':
      return '@RSS feed';
  }
}

export function MultiPosterPanel({ initialImageUrl = '', initialText = '', initialPrompt = '' }: MultiPosterPanelProps) {
  const [hydrated, setHydrated] = useState(false);
  const [posterUserId, setPosterUserId] = useState('');
  const [posterUserName, setPosterUserName] = useState('Guest');
  const [posterCopy, setPosterCopy] = useState('');
  const [posterCopyTouched, setPosterCopyTouched] = useState(false);
  const [posterConnections, setPosterConnections] = useState<Record<PosterPlatformKey, PosterPlatformState>>(emptyPlatformStates);
  const [selectedPosterPlatforms, setSelectedPosterPlatforms] = useState<Record<PosterPlatformKey, boolean>>(emptyPlatformSelection);
  const [posterConnectionsLoading, setPosterConnectionsLoading] = useState(false);
  const [posterConnectionsError, setPosterConnectionsError] = useState<string | null>(null);
  const [posterPublishError, setPosterPublishError] = useState<string | null>(null);
  const [posterPublishing, setPosterPublishing] = useState(false);
  const [posterResults, setPosterResults] = useState<Record<string, { success?: boolean }>>({});
  const [chatMessages, setChatMessages] = useState<Array<{ id?: string; user?: string; text?: string; assetUrl?: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [catalogPreviewUrl, setCatalogPreviewUrl] = useState('');
  const [scheduleValue, setScheduleValue] = useState('');

  const posterMediaUrl = useMemo(() => {
    const shared = initialImageUrl.trim();
    if (shared) return shared;
    return catalogPreviewUrl.trim();
  }, [catalogPreviewUrl, initialImageUrl]);
  const posterDefaultCopy = useMemo(() => {
    const sharedText = initialText.trim();
    if (sharedText) return sharedText;
    return initialPrompt.trim();
  }, [initialPrompt, initialText]);
  const selectedPosterPlatformList = useMemo(
    () =>
      (Object.entries(selectedPosterPlatforms) as Array<[PosterPlatformKey, boolean]>)
        .filter(([, selected]) => selected)
        .map(([platform]) => platform),
    [selectedPosterPlatforms],
  );

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      const user = isRecord(parsed) ? parsed : {};
      const userId = typeof user.id === 'string' ? user.id.trim() : '';
      const userName = typeof user.name === 'string' ? user.name.trim() : '';
      if (userId) setPosterUserId(userId);
      if (userName) setPosterUserName(userName);
    } catch {
    }
  }, []);

  useEffect(() => {
    if (posterCopyTouched) return;
    if (!posterDefaultCopy) return;
    setPosterCopy((prev) => (prev.trim() ? prev : posterDefaultCopy));
  }, [posterCopyTouched, posterDefaultCopy]);

  const loadPosterConnections = useCallback(async () => {
    setPosterConnectionsLoading(true);
    setPosterConnectionsError(null);
    try {
      const query = posterUserId ? `?userId=${encodeURIComponent(posterUserId)}` : '';
      const res = await fetch(`/api/auth/session${query}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Failed to load connection state');
      setPosterConnections(buildPosterPlatformStates(json));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load connection state';
      setPosterConnectionsError(message);
      setPosterConnections(emptyPlatformStates());
    } finally {
      setPosterConnectionsLoading(false);
    }
  }, [posterUserId]);

  const loadPosterSupportData = useCallback(async () => {
    setChatLoading(true);
    setChatError(null);
    try {
      const [historyRes, postsRes] = await Promise.all([
        fetch('/api/chat/history'),
        fetch('/api/catalog/posts'),
      ]);
      const historyJson = await historyRes.json().catch(() => ({}));
      const postsJson = await postsRes.json().catch(() => ({}));

      if (!historyRes.ok) throw new Error('Failed to load chat history');

      const messages = isRecord(historyJson) && isRecord(historyJson.data) && Array.isArray(historyJson.data.messages)
        ? (historyJson.data.messages as Array<{ id?: string; user?: string; text?: string; assetUrl?: string }>)
        : [];
      setChatMessages(messages);

      const posts = isRecord(postsJson) && Array.isArray(postsJson.posts)
        ? (postsJson.posts as Array<{ metadata?: { mediaUrl?: unknown } }>)
        : [];
      const mediaUrl = posts
        .map((post) => (isRecord(post.metadata) && typeof post.metadata.mediaUrl === 'string' ? post.metadata.mediaUrl.trim() : ''))
        .find(Boolean);
      setCatalogPreviewUrl(mediaUrl || '');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load poster data';
      setChatError(message);
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void loadPosterConnections();
    void loadPosterSupportData();
  }, [hydrated, loadPosterConnections, loadPosterSupportData]);

  const handlePosterPlatformToggle = (platform: PosterPlatformKey) => {
    if (!posterConnections[platform]?.authenticated) return;
    setSelectedPosterPlatforms((prev) => ({ ...prev, [platform]: !prev[platform] }));
  };

  const handlePosterPublish = async () => {
    if (!selectedPosterPlatformList.length || !posterCopy.trim()) return;

    setPosterPublishing(true);
    setPosterPublishError(null);
    setPosterResults({});

    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: posterUserId,
          content: posterCopy.trim(),
          platforms: selectedPosterPlatformList,
          metadata: {
            mediaUrl: posterMediaUrl || undefined,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && !isRecord(json)) {
        throw new Error('Failed to publish post');
      }
      const resultMap = isRecord(json) && isRecord(json.results) ? (json.results as Record<string, { success?: boolean }>) : {};
      setPosterResults(resultMap);
      if (!res.ok) {
        const message = isRecord(json) && typeof json.error === 'string' ? json.error : 'Failed to publish post';
        setPosterPublishError(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish post';
      setPosterPublishError(message);
    } finally {
      setPosterPublishing(false);
    }
  };

  const handleSendChat = async (includeAsset: boolean) => {
    const text = chatInput.trim();
    const assetUrl = includeAsset ? posterMediaUrl || undefined : undefined;
    if (!text && !assetUrl) return;

    setChatError(null);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: posterUserName || 'Guest',
          text,
          assetUrl,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = isRecord(json) && typeof json.error === 'string' ? json.error : 'Failed to send chat message';
        throw new Error(message);
      }
      const nextMessage = isRecord(json) && isRecord(json.data) && isRecord(json.data.message)
        ? (json.data.message as { id?: string; user?: string; text?: string; assetUrl?: string })
        : { user: posterUserName || 'Guest', text, assetUrl };
      setChatMessages((prev) => [...prev, nextMessage]);
      setChatInput('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send chat message';
      setChatError(message);
    }
  };

  return (
    <div className="rounded-[28px] border border-slate-700/80 bg-[radial-gradient(circle_at_top,#1c2b45,transparent_55%),linear-gradient(180deg,#0f1d33_0%,#0a1322_100%)] p-5 text-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Multichannel Poster</h2>
          <div className="mt-1 text-sm text-slate-300/80">
            Use the Studio poster template to chat, schedule, and publish across your connected channels.
          </div>
        </div>
        {posterMediaUrl ? (
          <img
            src={posterMediaUrl}
            alt="Attached preview"
            className="h-28 w-44 rounded-[24px] border border-slate-600/70 object-cover shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
          />
        ) : null}
      </div>

      <div className="mt-5">
        <textarea
          id="poster-copy"
          aria-label="Poster Copy"
          value={posterCopy}
          onChange={(e) => {
            setPosterCopyTouched(true);
            setPosterCopy(e.target.value);
          }}
          className="min-h-40 w-full rounded-[24px] border border-slate-600/80 bg-[#07132a]/80 p-5 text-2xl text-slate-200 outline-none placeholder:text-slate-400 focus:border-blue-400"
          placeholder="What's on your mind? #Web3"
        />
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-700/90 bg-[#07132a]/85 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-white">Live Chat</h3>
          <span className={`text-sm font-medium ${chatLoading ? 'text-slate-300' : 'text-emerald-300'}`}>
            {chatLoading ? 'Connecting...' : 'Connected'}
          </span>
        </div>
        <div className="mt-4 text-sm text-slate-300/80">
          {chatMessages.length
            ? `${chatMessages[chatMessages.length - 1]?.user || 'Guest'}: ${chatMessages[chatMessages.length - 1]?.text || 'Shared an asset'}`
            : 'No messages yet'}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
          <input
            aria-label="Chat User"
            value={posterUserName}
            onChange={(e) => setPosterUserName(e.target.value)}
            className="rounded-[18px] border border-slate-600/80 bg-black px-4 py-3 text-xl text-slate-100 outline-none focus:border-blue-400"
          />
          <input
            aria-label="Live Chat Message"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Discuss the generation"
            className="rounded-[18px] border border-slate-600/80 bg-black px-4 py-3 text-xl text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400"
          />
          <button
            type="button"
            onClick={() => {
              void handleSendChat(false);
            }}
            className="rounded-[18px] bg-blue-600 px-6 py-3 text-xl font-semibold text-white hover:bg-blue-500"
          >
            Send
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void handleSendChat(true);
            }}
            disabled={!posterMediaUrl}
            className="rounded-[18px] bg-slate-700/70 px-5 py-3 text-lg font-semibold text-slate-200 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Share Asset to Chat
          </button>
          <div className="text-sm text-slate-400">Media: {posterMediaUrl || 'No generated image selected yet'}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {PLATFORM_ORDER.map((platform) => {
          const state = posterConnections[platform];
          const selected = selectedPosterPlatforms[platform];
          return (
            <button
              key={platform}
              type="button"
              aria-label={`Post to ${POSTER_PLATFORM_NAMES[platform]}`}
              onClick={() => handlePosterPlatformToggle(platform)}
              disabled={!state?.authenticated}
              className={`min-h-[84px] rounded-[18px] px-5 py-4 text-left text-lg font-semibold text-white transition ${
                PLATFORM_BUTTON_CLASSES[platform]
              } ${selected ? 'ring-4 ring-white/50' : ''} ${state?.authenticated ? '' : 'opacity-90'}`}
            >
              <div>{getPlatformButtonLabel(platform, state)}</div>
              <div className="mt-1 text-sm font-medium text-white/80">{state?.label}</div>
            </button>
          );
        })}
      </div>

      {posterConnectionsError ? (
        <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
          {posterConnectionsError}
        </div>
      ) : null}

      {chatError ? (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {chatError}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <input
          aria-label="Schedule (optional)"
          value={scheduleValue}
          onChange={(e) => setScheduleValue(e.target.value)}
          placeholder="Schedule (optional)"
          className="rounded-[18px] border border-slate-600/80 bg-[#07132a]/80 px-4 py-4 text-xl text-slate-100 outline-none placeholder:text-slate-400 focus:border-blue-400"
        />
        <button
          type="button"
          onClick={handlePosterPublish}
          disabled={posterPublishing || !posterCopy.trim() || !selectedPosterPlatformList.length}
          className="rounded-[18px] bg-purple-600 px-5 py-4 text-lg font-semibold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {posterPublishing ? 'Posting...' : 'Post to All Channels'}
        </button>
      </div>

      <div className="mt-3 text-sm text-slate-400">
        Selected: {selectedPosterPlatformList.length ? selectedPosterPlatformList.join(', ') : 'none'}
      </div>

      {posterPublishError ? (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {posterPublishError}
        </div>
      ) : null}

      {Object.keys(posterResults).length ? (
        <div className="mt-4 rounded-lg border border-slate-700/70 bg-black/20 p-3">
          <div className="text-sm font-semibold text-white">Platform Results</div>
          <div className="mt-2 space-y-1 text-sm text-slate-200">
            {Object.entries(posterResults).map(([platform, result]) => (
              <div key={platform}>
                {platform}: {result?.success ? 'success' : 'failed'}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-400">
        <div className="grid grid-cols-7 gap-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="flex gap-3">
          <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-white">Prev</button>
          <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-white">Next</button>
        </div>
      </div>
    </div>
  );
}
