import { describe, expect, it } from 'vitest';

import { computeDesignHash } from './designMockups';

describe('design mockups', () => {
  it('computes a stable hash for the same normalized inputs', () => {
    const a = computeDesignHash({
      imageUrl: ' https://example.com/design.png ',
      prompt: '  quantum skyline  ',
    });
    const b = computeDesignHash({
      imageUrl: 'https://example.com/design.png',
      prompt: 'quantum skyline',
    });
    expect(a).toBe(b);
  });
});
