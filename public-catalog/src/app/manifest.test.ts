import { describe, expect, it } from 'vitest';

import manifest from './manifest';

describe('web app manifest', () => {
  it('defines branded app icons for home-screen installs', () => {
    const data = manifest();
    expect(data.name).toBeTruthy();
    expect(data.short_name).toBeTruthy();
    expect(data.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }),
      ]),
    );
    expect(data.display).toBe('standalone');
  });
});
