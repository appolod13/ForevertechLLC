import { describe, expect, it } from 'vitest';

import {
  saveStoredGeneration,
  upsertSourceRecord,
  type SourceRecordLike,
  type StoredGenerationRecord,
} from './creatorArtifacts';
import { getCreatorAccess } from './creatorAccess';

describe('creatorArtifacts', () => {
  it('evicts the oldest free generation when the free cap is reached', () => {
    const existing: StoredGenerationRecord[] = Array.from({ length: 20 }, (_, index) => ({
      id: `generation-${index}`,
      prompt: `prompt-${index}`,
      imageUrl: `https://example.com/${index}.png`,
      createdAt: new Date(2026, 5, index + 1).toISOString(),
      storedVia: 'free',
    }));

    const result = saveStoredGeneration(existing, {
      access: getCreatorAccess({ id: 'user-1' }),
      record: {
        id: 'generation-new',
        prompt: 'new prompt',
        imageUrl: 'https://example.com/new.png',
        createdAt: new Date(2026, 5, 21).toISOString(),
        storedVia: 'free',
      },
    });

    expect(result.saved).toBe(true);
    expect(result.records).toHaveLength(20);
    expect(result.records[0]?.id).toBe('generation-new');
    expect(result.records.find((r) => r.id === 'generation-0')).toBeUndefined();
  });

  it('saves a paid quantum generation even after the free cap is reached', () => {
    const existing: StoredGenerationRecord[] = Array.from({ length: 20 }, (_, index) => ({
      id: `generation-${index}`,
      prompt: `prompt-${index}`,
      imageUrl: `https://example.com/${index}.png`,
      createdAt: new Date(2026, 5, index + 1).toISOString(),
      storedVia: 'free',
    }));

    const result = saveStoredGeneration(existing, {
      access: getCreatorAccess({ id: 'user-1' }),
      record: {
        id: 'generation-21',
        prompt: 'quantum prompt',
        imageUrl: 'https://example.com/21.png',
        createdAt: new Date(2026, 5, 21).toISOString(),
        storedVia: 'quantum_paid',
      },
    });

    expect(result.saved).toBe(true);
    expect(result.records).toHaveLength(21);
  });

  it('upserts source records by id so new metadata replaces stale copies', () => {
    const existing: SourceRecordLike[] = [
      {
        id: 'record-1',
        createdAt: '2026-06-29T00:00:00.000Z',
        prompt: 'old prompt',
        imageUrl: 'https://example.com/old.png',
        model: 'old-model',
        metadata: { provider: 'ibm' },
      },
    ];

    const next = upsertSourceRecord(existing, {
      id: 'record-1',
      createdAt: '2026-06-29T00:05:00.000Z',
      prompt: 'new prompt',
      imageUrl: 'https://example.com/new.png',
      model: 'new-model',
      metadata: { provider: 'ibm', seed: 42 },
    });

    expect(next).toHaveLength(1);
    expect(next[0]?.prompt).toBe('new prompt');
    expect(next[0]?.metadata.seed).toBe(42);
  });
});
