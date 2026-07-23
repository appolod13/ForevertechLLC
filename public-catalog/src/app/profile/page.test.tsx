import '@testing-library/jest-dom/vitest';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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

    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ orders: [], success: true, connected: true, webhookDisplay: 'https://discord.com/.../abc...xyz' }),
    })) as typeof fetch;
  });

  it('shows premium creator status and stored generation usage', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Premium Creator')).toBeInTheDocument();
    });

    expect(screen.getByText('45% payout active')).toBeInTheDocument();
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

  it('deletes only the selected saved generations and updates local storage', async () => {
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
      expect(screen.getByText('Saved AI Generations')).toBeInTheDocument();
    });

    expect(screen.getByText('2 / 5')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select saved generation prompt-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }));

    await waitFor(() => {
      expect(screen.queryByText('prompt-1')).not.toBeInTheDocument();
    });

    expect(screen.getByText('prompt-2')).toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem('foreverteck.studio.savedGenerations') || '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0]?.id).toBe('generation-2');
  });
});
