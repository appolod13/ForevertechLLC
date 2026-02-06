import { describe, it, expect } from 'vitest';
import { verifyJwtHs256 } from '@/lib/integrations/auth';

describe('verifyJwtHs256', () => {
  it('rejects invalid token', () => {
    const ok = verifyJwtHs256('a.b.c', 'secret');
    expect(ok).toBe(false);
  });
});
