import '@testing-library/jest-dom/vitest';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import ProfilePage from './page';

const useAuthMock = vi.fn();
const pushMock = vi.fn();
let searchParamsMock = new URLSearchParams();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsMock,
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    localStorage.clear();
    searchParamsMock = new URLSearchParams();
    localStorage.setItem(
      'foreverteck.studio.savedGenerations',
      JSON.stringify([
        {
          id: 'generation-1',
          prompt: 'prompt-1',
          imageUrl: 'https://example.com/1.png',
          createdAt: '2026-06-29T00:00:00.000Z',
          storedVia: 'free',
        },
        {
          id: 'generation-2',
          prompt: 'prompt-2',
          imageUrl: 'https://example.com/2.png',
          createdAt: '2026-06-29T01:00:00.000Z',
          storedVia: 'quantum_paid',
        },
      ]),
    );

    useAuthMock.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        premiumCreator: true,
      },
      isLoading: false,
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/social/discord')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            connected: true,
            webhookDisplay: 'https://discord.com/.../abc...xyz',
          }),
        } as Response;
      }
      if (url.includes('/api/auth/session')) {
        return {
          ok: true,
          json: async () => ({
            twitter: { authenticated: true, screenName: 'bird_bot' },
            telegram: { authenticated: true, screenName: 'tg_channel' },
            instagram: { authenticated: false },
            tiktok: { authenticated: true, screenName: 'motion_drop' },
            youtube: { authenticated: false },
            reddit: { authenticated: true, screenName: 'reddit_user' },
            discord: { authenticated: true, screenName: 'Discord connected' },
            rss: { authenticated: true, screenName: 'RSS feed' },
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ orders: [], success: true }),
      } as Response;
    }) as typeof fetch;
  });

  it('shows premium creator status and stored generation usage', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Premium Creator')).toBeInTheDocument();
    });

    expect(screen.getByText('75% payout active')).toBeInTheDocument();
    expect(screen.getByText('Stored Generations')).toBeInTheDocument();
    expect(screen.getByText('2 / Unlimited')).toBeInTheDocument();
  });

  it('shows Stripe Express connected status when the creator account is already linked', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        premiumCreator: true,
        stripeConnectAccountId: 'acct_123',
      },
      isLoading: false,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Stripe Express connected')).toBeInTheDocument();
    });

    expect(screen.getByText('acct_123')).toBeInTheDocument();
  });

  it('shows premium creator checkout actions when upgrade is selected', async () => {
    searchParamsMock = new URLSearchParams({ upgrade: 'premium-creator' });

    useAuthMock.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        premiumCreator: false,
      },
      isLoading: false,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Premium Creator upgrade selected.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Connect Stripe Express' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate Premium Creator' })).toBeInTheDocument();
  });

  it('shows Discord webhook management in profile settings', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Discord Webhook')).toBeInTheDocument();
    });

    expect(screen.getByText('https://discord.com/.../abc...xyz')).toBeInTheDocument();
  });

  it('shows all connected social destinations in profile settings', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Social Connections')).toBeInTheDocument();
    });

    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('TikTok')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('Reddit')).toBeInTheDocument();
    expect(screen.getByText('Discord')).toBeInTheDocument();
    expect(screen.getByText('RSS')).toBeInTheDocument();
    expect(screen.getByText('Twitter connected')).toBeInTheDocument();
    expect(screen.getByText('Telegram connected')).toBeInTheDocument();
    expect(screen.getByText('Instagram needs connection')).toBeInTheDocument();
    expect(screen.getByText('TikTok connected')).toBeInTheDocument();
    expect(screen.getByText('YouTube needs connection')).toBeInTheDocument();
    expect(screen.getByText('Reddit connected')).toBeInTheDocument();
    expect(screen.getAllByText('Discord connected').length).toBeGreaterThan(0);
    expect(screen.getByText('RSS available')).toBeInTheDocument();
  });

  it('shows a social calendar draft section in profile settings', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Social Calendar')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Campaign Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Campaign End Date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Calendar Draft' })).toBeInTheDocument();
  });
});
