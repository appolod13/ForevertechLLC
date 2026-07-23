'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildPosterPlatformStates,
  isRecord,
  POSTER_PLATFORM_NAMES,
  type PosterPlatformKey,
  type PosterPlatformState,
} from '@/lib/multiposter';
import { useAuth } from '@/context/AuthContext';

type MultiPosterPanelProps = {
  initialImageUrl?: string;
  initialText?: string;
  initialPrompt?: string;
};

export function MultiPosterPanel({ initialImageUrl = '', initialText = '', initialPrompt = '' }: MultiPosterPanelProps) {
  const { user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [posterUserId, setPosterUserId] = useState('');
  const [posterCopy, setPosterCopy] = useState('');
  const [posterCopyTouched, setPosterCopyTouched] = useState(false);
  const [posterConnections, setPosterConnections] = useState<Record<PosterPlatformKey, PosterPlatformState>>({
    reddit: { status: 'needs_connection', label: 'Reddit needs connection', authenticated: false },
    discord: { status: 'needs_connection', label: 'Discord needs connection', authenticated: false },
    rss: { status: 'warning', label: 'RSS unavailable', authenticated: false },
  });
  const [selectedPosterPlatforms, setSelectedPosterPlatforms] = useState<Record<PosterPlatformKey, boolean>>({
    reddit: false,
    discord: false,
    rss: false,
  });
  const [posterConnectionsLoading, setPosterConnectionsLoading] = useState(false);
  const [posterConnectionsError, setPosterConnectionsError] = useState<string | null>(null);
  const [posterPublishError, setPosterPublishError] = useState<string | null>(null);
  const [posterPublishing, setPosterPublishing] = useState(false);
  const [posterResults, setPosterResults] = useState<Record<string, { success?: boolean }>>({});

  const posterMediaUrl = useMemo(() => initialImageUrl.trim(), [initialImageUrl]);
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
    const authUserId = typeof user?.id === 'string' ? user.id.trim() : '';
    if (authUserId) {
      setPosterUserId(authUserId);
      return;
    }
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      const user = isRecord(parsed) ? parsed : {};
      const userId = typeof user.id === 'string' ? user.id.trim() : '';
      if (userId) setPosterUserId(userId);
    } catch {
    }
  }, [user?.id]);

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
      setPosterConnections({
        reddit: { status: 'warning', label: 'Reddit status unavailable', authenticated: false },
        discord: { status: 'warning', label: 'Discord status unavailable', authenticated: false },
        rss: { status: 'warning', label: 'RSS status unavailable', authenticated: false },
      });
    } finally {
      setPosterConnectionsLoading(false);
    }
  }, [posterUserId]);

  useEffect(() => {
    if (!hydrated) return;
    void loadPosterConnections();
  }, [hydrated, loadPosterConnections]);

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

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-950/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Multichannel Poster</h2>
          <div className="mt-1 text-sm text-gray-400">
            Publish the latest generated image and caption across your connected channels.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadPosterConnections();
          }}
          disabled={posterConnectionsLoading}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Connections
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {(['reddit', 'discord', 'rss'] as PosterPlatformKey[]).map((platform) => (
          <label
            key={platform}
            className={`rounded-lg border p-3 transition-all ${
              posterConnections[platform].authenticated
                ? 'cursor-pointer border-gray-700 bg-gray-900/80 hover:border-gray-500'
                : 'cursor-not-allowed border-gray-800 bg-gray-900/40 opacity-80'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                aria-label={`Post to ${POSTER_PLATFORM_NAMES[platform]}`}
                checked={selectedPosterPlatforms[platform]}
                disabled={!posterConnections[platform].authenticated}
                onChange={() => handlePosterPlatformToggle(platform)}
                className="mt-1 h-4 w-4 accent-purple-500"
              />
              <div>
                <div className="font-semibold text-white">{POSTER_PLATFORM_NAMES[platform]}</div>
                <div className="text-sm text-gray-400">{posterConnections[platform].label}</div>
              </div>
            </div>
          </label>
        ))}
      </div>

      {posterConnectionsError ? (
        <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
          {posterConnectionsError}
        </div>
      ) : null}

      <div className="mt-4">
        <label htmlFor="poster-copy" className="mb-2 block text-sm font-semibold text-white">
          Poster Copy
        </label>
        <textarea
          id="poster-copy"
          aria-label="Poster Copy"
          value={posterCopy}
          onChange={(e) => {
            setPosterCopyTouched(true);
            setPosterCopy(e.target.value);
          }}
          className="h-32 w-full rounded-lg border border-gray-700 bg-gray-900 p-4 text-white outline-none focus:border-purple-500"
          placeholder="Write the post you want to publish..."
        />
      </div>

      <div className="mt-3 rounded-lg border border-gray-800 bg-black/20 px-3 py-2 text-sm text-gray-400">
        Media: {posterMediaUrl || 'No generated image selected yet'}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePosterPublish}
          disabled={posterPublishing || !posterCopy.trim() || !selectedPosterPlatformList.length}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-gray-700"
        >
          {posterPublishing ? 'Posting...' : 'Post to All Channels'}
        </button>
        <div className="text-sm text-gray-500">
          Selected: {selectedPosterPlatformList.length ? selectedPosterPlatformList.join(', ') : 'none'}
        </div>
      </div>

      {posterPublishError ? (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {posterPublishError}
        </div>
      ) : null}

      {Object.keys(posterResults).length ? (
        <div className="mt-4 rounded-lg border border-gray-800 bg-black/20 p-3">
          <div className="text-sm font-semibold text-white">Platform Results</div>
          <div className="mt-2 space-y-1 text-sm text-gray-300">
            {Object.entries(posterResults).map(([platform, result]) => (
              <div key={platform}>
                {platform}: {result?.success ? 'success' : 'failed'}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
