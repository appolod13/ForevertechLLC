import { describe, expect, it } from 'vitest';

import { buildPlatformLoginUrl } from './authRedirect';

describe('buildPlatformLoginUrl', () => {
  it('adds the current user id to Reddit login redirects', () => {
    expect(buildPlatformLoginUrl('reddit', 'user-42')).toBe('/api/auth/reddit/login?userId=user-42');
  });

  it('keeps non-Reddit platform redirects unchanged', () => {
    expect(buildPlatformLoginUrl('twitter', 'user-42')).toBe('/api/auth/twitter/login');
  });
});
