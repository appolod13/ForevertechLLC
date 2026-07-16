import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LatestAIImage } from './LatestAIImage';

describe('LatestAIImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the generated override image when an earlier latest-image fetch fails later', async () => {
    let rejectFetch: ((error: Error) => void) | null = null;

    global.fetch = vi.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectFetch = reject;
        }),
    ) as typeof fetch;

    const { rerender } = render(<LatestAIImage />);

    rerender(<LatestAIImage overrideUrl="https://example.com/generated.png" />);

    await waitFor(() => {
      const img = screen.getByRole('img', { name: 'Latest AI Generated Content' });
      expect(img).toHaveAttribute('src', 'https://example.com/generated.png');
    });

    rejectFetch?.(new Error('network failed'));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText('Latest generation unavailable')).not.toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'Latest AI Generated Content' });
    expect(img).toHaveAttribute('src', 'https://example.com/generated.png');
  });
});
