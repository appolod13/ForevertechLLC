import { describe, it, expect } from 'vitest';
import { buildQuery } from '../../search/buildQuery';

describe('buildQuery', () => {
  it('builds exact phrase with site and filetype', () => {
    const q = buildQuery({ query: 'FutureTech innovations 2026', exact: true, siteFilters: ['.edu'], filetypes: ['pdf'] });
    expect(q).toContain('"FutureTech innovations 2026"');
    expect(q).toContain('site:.edu');
    expect(q).toContain('filetype:pdf');
  });

  it('handles non-exact query', () => {
    const q = buildQuery({ query: 'FutureTech company profile' });
    expect(q).toBe('FutureTech company profile');
  });
});

