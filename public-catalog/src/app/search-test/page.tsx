'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { NavButton } from '@/components/NavButton';

interface SearchResult {
  title?: string;
  url?: string;
  snippet?: string;
}

export default function SearchTestPage() {
  const [query, setQuery] = useState('FutureTech innovations 2026');
  const [exact, setExact] = useState(true);
  const [edu, setEdu] = useState(true);
  const [gov, setGov] = useState(false);
  const [pdf, setPdf] = useState(true);
  const [limit, setLimit] = useState(5);
  const [built, setBuilt] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    setBuilt('');
    setResults([]);
    try {
      const siteFilters = [
        ...(edu ? ['.edu'] : []),
        ...(gov ? ['.gov'] : []),
      ];
      const filetypes = pdf ? ['pdf'] : [];
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, exact, siteFilters, filetypes, limit }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(String(data.error || 'search-failed'));
      setBuilt(String(data.query || ''));
      setResults(Array.isArray(data.results) ? data.results : []);
      setStatus(String(data.providerStatus || 'unknown'));
    } catch (e) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-5xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">FutureTech Search Test</h1>
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='e.g., "FutureTech company profile"'
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={exact} onChange={e => setExact(e.target.checked)} />
                <span>Exact Phrase</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4 accent-green-500" checked={edu} onChange={e => setEdu(e.target.checked)} />
                <span>site:.edu</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4 accent-green-500" checked={gov} onChange={e => setGov(e.target.checked)} />
                <span>site:.gov</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4 accent-pink-500" checked={pdf} onChange={e => setPdf(e.target.checked)} />
                <span>filetype:pdf</span>
              </label>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={10}
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="bg-gray-900 border border-gray-600 rounded p-2 text-sm w-24"
            />
            <NavButton label={loading ? 'Searching...' : 'Search'} ariaLabel="Run search" onActivate={runSearch} disabled={loading || !query.trim()} />
          </div>
          <div className="mt-4 text-sm text-gray-400">
            Built Query: <span className="font-mono">{built || '(none)'}</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Provider: {status || 'unknown'} {status === 'missing' && '(configure NEXT_PUBLIC_SEARCH_PROXY_URL)'}
          </div>
          {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        </div>

        <div className="mt-6 rounded-xl border border-gray-700 bg-gray-900 p-4">
          <h2 className="text-xl font-semibold mb-3">Results</h2>
          {loading && <div className="text-gray-400">Loading...</div>}
          {!loading && results.length === 0 && <div className="text-gray-500 text-sm">No results (or provider missing)</div>}
          {!loading && results.length > 0 && (
            <ul className="space-y-3">
              {results.map((r, idx) => (
                <li key={idx} className="rounded-lg border border-gray-700 p-3">
                  <div className="text-sm font-semibold">{r.title || '(untitled)'}</div>
                  <div className="text-xs text-blue-400 break-words">{r.url}</div>
                  <div className="text-xs text-gray-400 mt-1">{r.snippet}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

