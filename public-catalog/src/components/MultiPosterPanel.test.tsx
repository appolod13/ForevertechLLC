import '@testing-library/jest-dom/vitest';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MultiPosterPanel } from './MultiPosterPanel';

const useAuthMock = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

describe('MultiPosterPanel', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    localStorage.clear();
    useAuthMock.mockReturnValue({
      user: {
        id: 'auth-user',
        name: 'Poster User',
        email: 'poster@example.com',
      },
      isLoading: false,
    });
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/auth/session')) {
        return {
          ok: true,
          json: async () => ({
            reddit: { authenticated: false },
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
              discord: { success: true },
            },
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }) as typeof fetch;
  });

  it('prefers the authenticated user id over stale local storage for Discord posting', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'stale-user', name: 'Stale User' }));

    render(<MultiPosterPanel initialText="Quantum drop is live" />);

    await waitFor(() => {
      expect(screen.getByText('Discord connected')).toBeInTheDocument();
    });

    const fetchMock = global.fetch as unknown as {
      mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> };
    };
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/api/auth/session?userId=auth-user'))).toBe(true);

    fireEvent.click(screen.getByLabelText('Post to Discord'));
    fireEvent.click(screen.getByRole('button', { name: 'Post to All Channels' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/api/post'))).toBe(true);
    });

    const postCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/api/post'));
    expect(postCall?.[1]?.body).toEqual(
      JSON.stringify({
        userId: 'auth-user',
        content: 'Quantum drop is live',
        platforms: ['discord'],
        metadata: {},
      }),
    );
  });
});
