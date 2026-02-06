'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

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

export default function FactoryDashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/content-factory', { cache: 'no-store' });
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
        setLogs(Array.isArray(data.logs) ? data.logs : []);
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
          </div>
        )}
      </main>
    </div>
  );
}

