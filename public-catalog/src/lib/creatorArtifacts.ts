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
    return {
      saved: false,
      records: next,
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
