import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CheckoutPage from './page';

const useCartMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/context/CartContext', () => ({
  useCart: () => useCartMock(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

describe('CheckoutPage', () => {
  beforeEach(() => {
    useCartMock.mockReturnValue({
      items: [
        {
          id: 'item-1',
          title: 'Premium Tee - Black',
          price: 59.99,
          quantity: 1,
          metadata: {},
        },
      ],
      total: 59.99,
    });

    useAuthMock.mockReturnValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      isLoading: false,
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/quantum/status')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: { available: true, reason: '' } }),
        } as Response;
      }
      if (url.includes('/api/shipping/quote')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              options: [{ id: 'standard', label: 'Standard', amountUsd: 8 }],
            },
          }),
        } as Response;
      }
      throw new Error(`Unhandled fetch: ${url}`);
    }) as typeof fetch;
  });

  it('does not show the old checkout quantum premium upsell', async () => {
    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('Proceed to Stripe Checkout ($67.99)')).toBeInTheDocument();
    });

    expect(screen.queryByText('Quantum Verified Premium')).not.toBeInTheDocument();
  });

  it('shows the premium creator upsell instead of a checkout quantum upsell', async () => {
    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('Premium Creator - $24.99/month')).toBeInTheDocument();
    });

    expect(screen.getByText(/earn 75% on creator-linked sales/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upgrade to Premium Creator' })).toBeInTheDocument();
  });
});
