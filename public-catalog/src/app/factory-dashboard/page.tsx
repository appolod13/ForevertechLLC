'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { Loader2, AlertCircle, CheckCircle2, Clock, ThumbsUp, ThumbsDown, BrainCircuit, TrendingUp } from 'lucide-react';

interface Item {
  platform: 'linkedin' | 'instagram' | 'twitter';
  text_content: string;
  image_url: string;
  generation_metadata: Record<string, unknown>;
}

interface LogEntry {
  id: string;
  timestamp: number;
  stage: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs?: number;
  error?: { message: string; stack?: string; context?: Record<string, unknown> };
}

type FeedbackStats = {
  totals: { likes: number; dislikes: number };
  metrics: {
    total: number;
    likeRate: number;
    confidence: number;
    preferenceStrength: number;
    learningDegree: number;
  };
  topImages: Array<{ imageId: string; likes: number; dislikes: number; total: number; likeRate: number; lastAt: number }>;
  topPrompts: Array<{ prompt: string; likes: number; dislikes: number; total: number; likeRate: number; lastAt: number }>;
  recent: Array<{ id: string; timestamp: number; imageId: string; type: 'like' | 'dislike'; prompt?: string }>;
  explanation?: { signal?: string; learning?: string; learningDegree?: string };
};

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function formatPct(n: number) {
  return `${Math.round(clamp01(n) * 100)}%`;
}

export default function FactoryDashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res, fbRes] = await Promise.all([
          fetch('/api/content-factory', { cache: 'no-store' }),
          fetch('/api/ai/feedback', { cache: 'no-store' }).catch(() => null),
        ]);
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
        setLogs(Array.isArray(data.logs) ? data.logs : []);

        if (fbRes) {
          const fbJson = await fbRes.json().catch(() => null);
          if (fbJson && fbJson.success) setFeedback(fbJson as FeedbackStats);
        }
      } catch (e) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const parameterKeys = useMemo(() => {
    const setKey = new Set<string>();
    items.forEach(it => {
      Object.keys(it.generation_metadata || {}).forEach(k => setKey.add(k));
    });
    return Array.from(setKey);
  }, [items]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Content Factory Dashboard</h1>
            <p className="text-gray-400">Parameters, status, history, and analytics</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-700 bg-red-900/20 p-4 text-red-300 flex items-center gap-2">
            <AlertCircle /> {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="rounded-xl border border-gray-700 bg-gray-900 p-4">
              <h2 className="text-xl font-semibold mb-3">Available Parameters</h2>
              <div className="text-sm text-gray-300">
                {parameterKeys.length === 0 && <div className="text-gray-500">No parameters recorded yet</div>}
                {parameterKeys.length > 0 && (
                  <ul className="space-y-2">
                    {parameterKeys.map(k => (
                      <li key={k} className="flex items-center justify-between">
                        <span className="font-mono text-xs">{k}</span>
                        <span className="text-xs text-gray-500">Recorded</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-gray-700 bg-gray-900 p-4">
              <h2 className="text-xl font-semibold mb-3">Generation Status</h2>
              <div className="space-y-3">
                {logs.slice(0, 8).map(l => (
                  <div key={l.id} className="rounded-lg border border-gray-700 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-300">Stage: {l.stage}</div>
                      <div className="text-xs text-gray-500">{new Date(l.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {typeof l.durationMs === 'number' && (
                        <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> Duration: {l.durationMs} ms</div>
                      )}
                      {l.error && (
                        <div className="mt-1 text-red-400">Error: {l.error.message}</div>
                      )}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && <div className="text-sm text-gray-500">No logs yet</div>}
              </div>
            </section>

            <section className="rounded-xl border border-gray-700 bg-gray-900 p-4">
              <h2 className="text-xl font-semibold mb-3">Latest Items</h2>
              <div className="space-y-4">
                {items.slice(0, 5).map((it, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-700 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-300 capitalize">{it.platform}</div>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div className="aspect-video md:aspect-square rounded border border-gray-700 overflow-hidden bg-black/40">
                        <img src={it.image_url} alt="" className="object-contain w-full h-full" />
                      </div>
                      <div className="text-xs whitespace-pre-wrap text-gray-300">{it.text_content}</div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="text-sm text-gray-500">No generated content yet</div>}
              </div>
            </section>

            <section className="rounded-xl border border-gray-700 bg-gray-900 p-4 lg:col-span-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-purple-300" />
                  <h2 className="text-xl font-semibold">Feedback Learning Progress</h2>
                </div>
                <div className="text-xs text-gray-500">Live teaching signal from Likes / Dislikes</div>
              </div>

              {!feedback && (
                <div className="mt-4 rounded-lg border border-gray-800 bg-black/20 p-4 text-sm text-gray-400">
                  No feedback recorded yet. When users click Like/Dislike on items, this dashboard will show how the signal is shaping future generations.
                </div>
              )}

              {feedback && (
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="rounded-xl border border-gray-800 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-200">Overall Votes</div>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <ThumbsUp className="w-4 h-4 text-emerald-400" /> Likes
                        </div>
                        <div className="mt-1 text-2xl font-bold text-white">{feedback.totals.likes}</div>
                      </div>
                      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <ThumbsDown className="w-4 h-4 text-red-400" /> Dislikes
                        </div>
                        <div className="mt-1 text-2xl font-bold text-white">{feedback.totals.dislikes}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Like Rate</span>
                        <span className="font-semibold text-gray-200">{formatPct(feedback.metrics.likeRate)}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.round(clamp01(feedback.metrics.likeRate) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-gray-200">Learning Degrees</div>
                    <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                      These scores show how strongly the votes can guide future generations. More votes increases confidence; clearer preferences increase strength.
                    </p>

                    <div className="mt-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>Confidence (enough data)</span>
                          <span className="font-semibold text-gray-200">{formatPct(feedback.metrics.confidence)}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.round(clamp01(feedback.metrics.confidence) * 100)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>Preference Strength (clarity)</span>
                          <span className="font-semibold text-gray-200">{formatPct(feedback.metrics.preferenceStrength)}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.round(clamp01(feedback.metrics.preferenceStrength) * 100)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>Learning Degree (combined)</span>
                          <span className="font-semibold text-gray-200">{formatPct(feedback.metrics.learningDegree)}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full bg-purple-500 transition-all" style={{ width: `${Math.round(clamp01(feedback.metrics.learningDegree) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-gray-200">How Likes/Dislikes Teach</div>
                    <ul className="mt-3 space-y-2 text-xs text-gray-300">
                      <li>{feedback.explanation?.signal || 'Likes are treated as positive reinforcement; dislikes are treated as negative reinforcement.'}</li>
                      <li>{feedback.explanation?.learning || 'As feedback grows, the system can bias prompts, styles, and outputs toward what people keep liking.'}</li>
                      <li>{feedback.explanation?.learningDegree || 'Learning Degree summarizes how useful the current feedback signal is.'}</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-black/20 p-4 lg:col-span-2">
                    <div className="text-sm font-semibold text-gray-200">Top Prompt Signals</div>
                    <div className="mt-3 space-y-2">
                      {feedback.topPrompts.length === 0 && <div className="text-xs text-gray-500">No prompt feedback yet</div>}
                      {feedback.topPrompts.slice(0, 6).map((p) => (
                        <div key={`${p.prompt}_${p.lastAt}`} className="rounded-lg border border-gray-800 bg-gray-950/30 p-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-xs text-gray-200 line-clamp-1">{p.prompt}</div>
                            <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatPct(p.likeRate)} like</div>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.round(clamp01(p.likeRate) * 100)}%` }} />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                            <span>{p.likes} 👍 / {p.dislikes} 👎</span>
                            <span>{p.total} votes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-gray-200">Recent Feedback</div>
                    <div className="mt-3 space-y-2">
                      {feedback.recent.length === 0 && <div className="text-xs text-gray-500">No recent feedback</div>}
                      {feedback.recent.slice(0, 10).map((r) => (
                        <div key={r.id} className="rounded-lg border border-gray-800 bg-gray-950/30 p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-200">
                              {r.type === 'like' ? '👍 Like' : '👎 Dislike'}
                            </div>
                            <div className="text-[10px] text-gray-500">{new Date(r.timestamp).toLocaleTimeString()}</div>
                          </div>
                          <div className="mt-1 text-[10px] text-gray-500 line-clamp-1">Image: {r.imageId}</div>
                          {r.prompt && <div className="mt-1 text-[10px] text-gray-400 line-clamp-1">{r.prompt}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
