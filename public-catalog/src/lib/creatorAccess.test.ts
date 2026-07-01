import { describe, expect, it } from 'vitest';

import {
  buildQuantumSourceLinks,
  canStoreGeneration,
  getCreatorAccess,
  type StoredGenerationLike,
  type UserAccessLike,
} from './creatorAccess';

describe('creatorAccess', () => {
  it('defaults unauthenticated users to the free tier', () => {
    expect(getCreatorAccess(null)).toEqual({
      storageLimit: 20,
      tier: 'free',
      canResell: false,
      payoutRate: 0,
      hasPremiumCreatorAccess: false,
    });
  });

  it('allows premium creators to resell and bypass the free storage cap', () => {
    const user: UserAccessLike = { id: 'user-1', premiumCreator: true };
    const existing: StoredGenerationLike[] = Array.from({ length: 9 }, (_, index) => ({
      id: `generation-${index}`,
      prompt: `prompt-${index}`,
      imageUrl: `https://example.com/${index}.png`,
      createdAt: new Date(2026, 5, index + 1).toISOString(),
      storedVia: 'free',
    }));

    const access = getCreatorAccess(user);

    expect(access.tier).toBe('premium_creator');
    expect(access.canResell).toBe(true);
    expect(access.payoutRate).toBe(0.75);
    expect(canStoreGeneration(existing, { access, storedVia: 'premium_creator' })).toBe(true);
  });

  it('blocks a 21st free stored generation but allows a paid quantum artwork', () => {
    const access = getCreatorAccess({ id: 'user-1' });
    const existing: StoredGenerationLike[] = Array.from({ length: 20 }, (_, index) => ({
      id: `generation-${index}`,
      prompt: `prompt-${index}`,
      imageUrl: `https://example.com/${index}.png`,
      createdAt: new Date(2026, 5, index + 1).toISOString(),
      storedVia: 'free',
    }));

    expect(canStoreGeneration(existing, { access, storedVia: 'free' })).toBe(false);
    expect(canStoreGeneration(existing, { access, storedVia: 'quantum_paid' })).toBe(true);
  });

  it('allows a free generation even when 20 quantum_paid records already fill storage', () => {
    const access = getCreatorAccess({ id: 'user-1' });
    const existing: StoredGenerationLike[] = Array.from({ length: 20 }, (_, index) => ({
      id: `generation-${index}`,
      prompt: `prompt-${index}`,
      imageUrl: `https://example.com/${index}.png`,
      createdAt: new Date(2026, 5, index + 1).toISOString(),
      storedVia: 'quantum_paid' as const,
    }));

    // quantum_paid items must not consume free-tier slots, so a new free
    // generation should still be storable (freeCount = 0 < storageLimit 20).
    expect(canStoreGeneration(existing, { access, storedVia: 'free' })).toBe(true);
  });

  it('builds a connected PixelQrypt source route and IBM reference link', () => {
    const links = buildQuantumSourceLinks({
      id: 'record-1',
      metadata: {
        provider: 'ibm',
        backend: 'ibm_brisbane',
        jobId: 'job-123',
      },
    });

    expect(links.sourceRecordPath).toBe('/pixelqrypt/source?record=record-1');
    expect(links.externalSourceUrl).toContain('https://quantum.ibm.com');
    expect(links.externalSourceLabel).toBe('View IBM Quantum Reference');
  });
});
