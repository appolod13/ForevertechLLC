import { canStoreGeneration, type CreatorAccess, type StoredGenerationVia } from './creatorAccess';

export type StoredGenerationRecord = {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
  storedVia: StoredGenerationVia;
};

export type SourceRecordLike = {
  id: string;
  createdAt: string;
  prompt: string;
  imageUrl: string;
  model: string;
  metadata: Record<string, unknown>;
};

export function saveStoredGeneration(
  existing: StoredGenerationRecord[],
  options: {
    access: CreatorAccess;
    record: StoredGenerationRecord;
  },
) {
  const next = existing.filter((item) => item.id !== options.record.id);
  const saved = canStoreGeneration(next, {
    access: options.access,
    storedVia: options.record.storedVia,
  });

  if (!saved) {
    // Auto-evict the oldest free-tier generation (by createdAt) to make room
    let oldestFreeIndex = -1;
    for (let i = 0; i < next.length; i++) {
      if (next[i]!.storedVia !== 'free') continue;
      if (oldestFreeIndex === -1 || next[i]!.createdAt < next[oldestFreeIndex]!.createdAt) {
        oldestFreeIndex = i;
      }
    }
    if (oldestFreeIndex === -1) {
      return { saved: false, records: next };
    }
    const trimmed = next.filter((_, i) => i !== oldestFreeIndex);
    return {
      saved: true,
      records: [options.record, ...trimmed],
    };
  }

  return {
    saved: true,
    records: [options.record, ...next],
  };
}

export function upsertSourceRecord(existing: SourceRecordLike[], record: SourceRecordLike) {
  return [record, ...existing.filter((item) => item.id !== record.id)];
}
