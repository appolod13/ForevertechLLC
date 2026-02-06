import { describe, it, expect } from 'vitest';
import { generateCaptions, generateAutoSocialCaptions } from '@/lib/contentFactory/text';

describe('Auto Social Captions', () => {
  it('appends auto tags when enabled', () => {
    const base = generateCaptions('Hello world', ['linkedin', 'instagram', 'twitter']);
    const auto = generateAutoSocialCaptions('Hello world', ['linkedin', 'instagram', 'twitter']);
    expect(auto.linkedin.includes('#AutoGen')).toBe(true);
    expect(auto.instagram.includes('#AutoGen')).toBe(true);
    expect(auto.twitter.includes('#AutoGen')).toBe(true);
    expect(auto.linkedin.length).toBeGreaterThan(base.linkedin.length);
  });
});
