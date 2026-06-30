'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Header } from '@/components/Header';
import { buildQuantumSourceLinks } from '@/lib/creatorAccess';

type SourceRecord = {
  id: string;
  createdAt: string;
  prompt: string;
  imageUrl: string;
  model: string;
  metadata: Record<string, unknown>;
};

function readStoredSourceRecords() {
  try {
    const raw = localStorage.getItem('foreverteck.pixelqrypt.sourceRecords');
    if (!raw) return [] as SourceRecord[];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SourceRecord[]) : [];
  } catch {
    return [] as SourceRecord[];
  }
}

export default function PixelQryptSourcePage() {
  const searchParams = useSearchParams();
  const recordId = (searchParams.get('record') || '').trim();
  const [record, setRecord] = useState<SourceRecord | null>(null);

  useEffect(() => {
    const allRecords = readStoredSourceRecords();
    const fromList = allRecords.find((item) => item.id === recordId) || null;
    if (fromList) {
      setRecord(fromList);
      return;
    }

    try {
      const raw = localStorage.getItem('foreverteck.studio.lastQuantumRecord');
      if (!raw) {
        setRecord(null);
        return;
      }
      const parsed = JSON.parse(raw) as SourceRecord;
      setRecord(parsed?.id === recordId ? parsed : null);
    } catch {
      setRecord(null);
    }
  }, [recordId]);

  const links = useMemo(
    () => (record ? buildQuantumSourceLinks({ id: record.id, metadata: record.metadata }) : null),
    [record],
  );

  const seed = record?.metadata?.seed;
  const backend = record?.metadata?.backend;
  const measurements = record?.metadata?.measurements || record?.metadata?.shots;
  const qubit = record?.metadata?.qubit || record?.metadata?.qubits;

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-300">PixelQrypt</div>
            <h1 className="mt-3 text-3xl font-bold">PixelQrypt Source Record</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              View the stored provenance for a paid quantum artwork, including source metadata and connected provider verification.
            </p>
          </div>

          {!record ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-sm text-zinc-400">
              Source record not found. Return to Studio and generate a real quantum artwork to create a new record.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
                <div className="aspect-square bg-zinc-900">
                  <img src={record.imageUrl} alt={record.prompt} className="h-full w-full object-contain" />
                </div>
                <div className="border-t border-zinc-800 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Prompt</div>
                  <div className="mt-2 text-sm text-zinc-200">{record.prompt}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                  <div className="text-sm font-semibold text-white">Stored Proof Details</div>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-zinc-500">Record ID</dt>
                      <dd className="text-right text-zinc-100">{record.id}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-zinc-500">Created</dt>
                      <dd className="text-right text-zinc-100">{new Date(record.createdAt).toLocaleString()}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-zinc-500">Model</dt>
                      <dd className="text-right text-zinc-100">{record.model}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-zinc-500">Seed</dt>
                      <dd className="text-right text-zinc-100">{seed ? String(seed) : 'Unavailable'}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-zinc-500">Backend</dt>
                      <dd className="text-right text-zinc-100">{backend ? String(backend) : 'Unavailable'}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-zinc-500">Qubit</dt>
                      <dd className="text-right text-zinc-100">{qubit ? String(qubit) : 'Unavailable'}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-zinc-500">Measurements</dt>
                      <dd className="text-right break-all text-zinc-100">{measurements ? String(measurements) : 'Unavailable'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5">
                  <div className="text-sm font-semibold text-white">Connected Source Verification</div>
                  <p className="mt-2 text-sm text-purple-100/90">
                    PixelQrypt keeps the artwork, prompt, and proof together here while linking out to the source provider reference.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {links ? (
                      <Link
                        href={links.sourceRecordPath}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 bg-black/40 px-4 py-2 text-sm font-semibold text-white hover:bg-black/55"
                      >
                        Refresh Source Record
                      </Link>
                    ) : null}
                    {links?.externalSourceUrl ? (
                      <a
                        href={links.externalSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-purple-300/30 bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
                      >
                        {links.externalSourceLabel}
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
