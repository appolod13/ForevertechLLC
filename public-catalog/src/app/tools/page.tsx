'use client';

import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import BrainRandomizer from '../../components/BrainRandomizer';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export default function ToolsPage() {
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const res = await fetch('/api/admin/me', { cache: 'no-store' }).catch(() => null);
      const json: unknown = res ? await res.json().catch(() => null) : null;
      const ok = Boolean(res && res.ok && isRecord(json) && json.success === true);
      if (!cancelled) {
        setIsAdmin(ok);
        setAdminChecked(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const locked = process.env.NODE_ENV === 'production' && adminChecked && !isAdmin;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-5xl mx-auto p-8">
        {locked ? (
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h1 className="text-2xl font-bold mb-2">Tools</h1>
            <p className="text-gray-400">This page is only available to admins in production.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2">Tools</h1>
              <p className="text-gray-400">Utilities for training, testing, and internal workflows.</p>
            </div>

            <BrainRandomizer onImageGenerated={(url) => setGeneratedImage(url)} />

            {generatedImage ? (
              <div className="mt-6 rounded-2xl border border-gray-700 bg-black/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 text-sm text-gray-300">Latest Brain Output</div>
                <div className="aspect-video bg-black/60 flex items-center justify-center">
                  <img src={generatedImage} alt="Brain output" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

