import { describe, it, expect } from 'vitest';
import { validateFactoryRequest, validateFactoryOutput } from '../../contentFactory/validate';

describe('validateFactoryRequest', () => {
  it('rejects empty topic', () => {
    const res = validateFactoryRequest({
      topic: '',
      platforms: ['linkedin'],
      imageProvider: 'mock',
      safetyEnabled: true,
      mode: 'full',
    });
    expect(res.valid).toBe(false);
  });

  it('accepts valid payload', () => {
    const res = validateFactoryRequest({
      topic: 'Test',
      platforms: ['linkedin', 'instagram', 'twitter'],
      imageProvider: 'mock',
      safetyEnabled: true,
      mode: 'full',
    });
    expect(res.valid).toBe(true);
  });

  it('requires texts in image_only', () => {
    const res = validateFactoryRequest({
      topic: 'Test',
      platforms: ['instagram'],
      imageProvider: 'mock',
      safetyEnabled: true,
      mode: 'image_only',
      texts: {},
    });
    expect(res.valid).toBe(false);
  });
});

describe('validateFactoryOutput', () => {
  it('validates item shape', () => {
    const res = validateFactoryOutput([
      { platform: 'linkedin', text_content: 'Hello', image_url: 'data:image/svg+xml', generation_metadata: {} }
    ]);
    expect(res.valid).toBe(true);
  });
});

