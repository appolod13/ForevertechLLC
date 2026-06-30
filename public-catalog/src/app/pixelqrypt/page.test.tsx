import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import PixelQryptPage from './page';

vi.mock('@/components/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useSearchParams: () =>
      new URLSearchParams({
        code: 'PQ-123',
      }),
  };
});

describe('PixelQryptPage', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/pixelqrypt?')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            hiddenMessage: 'Collector access message',
            galleryItemId: 'gallery-1',
            imageUrl: 'https://example.com/asset.png',
            prompt: 'quantum skyline',
            creatorUserId: 'creator-1',
            creatorStripeAccountId: 'acct_123',
          }),
        } as Response;
      }
      if (url.includes('/api/pixelqrypt/purchase?')) {
        return {
          ok: false,
          status: 402,
          json: async () => ({ success: false, error: 'payment_required' }),
        } as Response;
      }
      throw new Error(`Unhandled fetch: ${url}`);
    }) as typeof fetch;
  });

  it('shows creator-linked one-time buyer messaging for public QR visitors', async () => {
    render(<PixelQryptPage />);

    await waitFor(() => {
      expect(screen.getByText('Creator-linked sale')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/one-time buyer access/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Buy This Code / Artwork' })).toBeInTheDocument();
  });
});
