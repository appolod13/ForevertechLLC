import '@testing-library/jest-dom/vitest';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import PosterPage from './page';
import { Providers } from '../../components/Providers';

const searchParamsState = new URLSearchParams();

vi.mock('../../components/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    usePathname: () => '/poster',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => searchParamsState,
  };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(<Providers>{ui}</Providers>);
}

async function renderPosterPage() {
  renderWithProviders(<PosterPage />);
  await waitFor(() => {
    expect(screen.getByText('Multichannel Poster')).toBeInTheDocument();
  });
}

describe('PosterPage', () => {
  beforeEach(() => {
    searchParamsState.forEach((_, key) => searchParamsState.delete(key));
    localStorage.clear();
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/auth/session')) {
        return {
          ok: true,
          json: async () => ({
            reddit: { authenticated: true, screenName: 'reddit_user' },
            discord: { authenticated: true, screenName: 'Discord connected' },
            rss: { authenticated: true, screenName: 'RSS feed' },
          }),
        } as Response;
      }
      if (url.includes('/api/post')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            results: {
              reddit: { success: true },
              discord: { success: true },
              rss: { success: true },
            },
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }) as typeof fetch;
  });

  it('loads live connection state for the dedicated multiposter page', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', name: 'Poster User' }));

    await renderPosterPage();

    const calls = (global.fetch as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> } }).mock.calls;
    const calledUrls = calls.map((c) => String(c[0]));

    expect(calledUrls.some((url) => url.includes('/api/auth/session?userId=user-1'))).toBe(true);
    expect(screen.getByText('Reddit connected')).toBeInTheDocument();
    expect(screen.getByText('Discord connected')).toBeInTheDocument();
    expect(screen.getByText('RSS available')).toBeInTheDocument();
  });

  it('prefills image and text from share params and publishes through the poster page', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', name: 'Poster User' }));
    searchParamsState.set('shareImage', 'https://example.com/latest-build.png');
    searchParamsState.set('shareText', 'Quantum drop is live');
    searchParamsState.set('sharePrompt', 'quantum skyline tee');

    const fetchMock = global.fetch as unknown as {
      mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> };
    };

    await renderPosterPage();

    expect(screen.getByLabelText('Poster Copy')).toHaveValue('Quantum drop is live');
    expect(screen.getByText('Media: https://example.com/latest-build.png')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Post to Reddit'));
    fireEvent.click(screen.getByLabelText('Post to Discord'));
    fireEvent.click(screen.getByLabelText('Post to RSS'));
    fireEvent.click(screen.getByRole('button', { name: 'Post to All Channels' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/api/post'))).toBe(true);
    });

    const postCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/api/post'));
    expect(postCall?.[1]?.body).toEqual(
      JSON.stringify({
        userId: 'user-1',
        content: 'Quantum drop is live',
        platforms: ['reddit', 'discord', 'rss'],
        metadata: {
          mediaUrl: 'https://example.com/latest-build.png',
        },
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('reddit: success')).toBeInTheDocument();
      expect(screen.getByText('discord: success')).toBeInTheDocument();
      expect(screen.getByText('rss: success')).toBeInTheDocument();
    });
  });
});
