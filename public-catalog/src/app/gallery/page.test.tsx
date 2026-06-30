import '@testing-library/jest-dom/vitest';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import GalleryPage from './page';

const useAuthMock = vi.fn();
const addToCartMock = vi.fn(async () => {});
const pushMock = vi.fn();

vi.mock('@/components/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('@/components/PixelQryptModal', () => ({
  default: () => <div>PixelQryptModal</div>,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({
    addToCart: addToCartMock,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('GalleryPage creator tab', () => {
  beforeEach(() => {
    pushMock.mockReset();
    addToCartMock.mockClear();
    localStorage.clear();
    localStorage.setItem('device_id', 'device-1');

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/gallery')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: 'gallery-1',
                imageUrl: 'https://example.com/1.png',
                prompt: 'quantum skyline',
                userName: 'Test User',
                catalogName: 'Test Catalog',
                userId: 'user-1',
                deviceId: 'device-1',
                isFavorite: false,
                createdAt: '2026-06-29T00:00:00.000Z',
                isQuantumVerified: true,
              },
            ],
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;
  });

  it('shows a Creator Upgrade tab for non-premium users', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        premiumCreator: false,
      },
    });

    render(<GalleryPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creator Upgrade' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Creator Upgrade' }));

    expect(screen.getByText(/upgrade to premium creator/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up for Stripe Express' })).toHaveAttribute('href', 'https://dashboard.stripe.com/connect');
    expect(screen.getByRole('button', { name: 'Activate Premium Creator' })).toBeInTheDocument();
  });

  it('shows a Creator Hub tab for premium users', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        premiumCreator: true,
        stripeConnectAccountId: 'acct_123',
      },
    });

    render(<GalleryPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creator Hub' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Creator Hub' }));

    expect(screen.getByText(/premium creator is active/i)).toBeInTheDocument();
    expect(screen.getByText('Stripe Express connected')).toBeInTheDocument();
    expect(screen.getByText('acct_123')).toBeInTheDocument();
  });
});
