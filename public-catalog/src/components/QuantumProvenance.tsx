'use client';

import React from 'react';

interface QuantumProvenanceProps {
  seed: string;
  jobId: string;
  backend: string;
  shots?: number;
  createdAt?: string;
  compact?: boolean;
}

export default function QuantumProvenance({
  seed,
  jobId,
  backend,
  shots = 256,
  createdAt,
  compact = false,
}: QuantumProvenanceProps) {
  if (!seed) return null;

  return (
    <div className={`rounded-xl border border-cyan-500/30 bg-black/60 p-4 text-sm ${compact ? 'max-w-xs' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-mono text-cyan-400 text-xs tracking-[2px]">QUANTUM PROVENANCE</span>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <span className="text-zinc-400">Seed (SHA-256 from IBM Quantum):</span>
          <div className="font-mono text-emerald-400 break-all mt-0.5">{seed}</div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div>
            <span className="text-zinc-400">IBM Job ID</span>
            <div className="font-mono text-white truncate">{jobId}</div>
          </div>
          <div>
            <span className="text-zinc-400">Backend</span>
            <div className="font-mono text-white">{backend}</div>
          </div>
          <div>
            <span className="text-zinc-400">Shots</span>
            <div className="font-mono text-white">{shots}</div>
          </div>
          {createdAt && (
            <div>
              <span className="text-zinc-400">Generated</span>
              <div className="font-mono text-white text-[10px]">{new Date(createdAt).toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-[10px] text-zinc-500">
        This design was seeded by real quantum measurements from IBM Quantum hardware.
      </p>
    </div>
  );
}
