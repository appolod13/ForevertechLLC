import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductCustomizer } from './ProductCustomizer';

const useRouterMock = vi.fn();
const addToCartMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => useRouterMock(),
}));

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({
    addToCart: addToCartMock,
  }),
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async () => 'data:image/png;base64,AAAA'),
  },
}));

describe('ProductCustomizer', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    useRouterMock.mockReturnValue({
      back: vi.fn(),
    });

    global.fetch = vi.fn(async () => {
      throw new Error('products unavailable');
    }) as typeof fetch;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows $59.99 pricing in the fallback merch product', async () => {
    render(<ProductCustomizer initialImageUrl="https://example.com/design.png" promptOverride="quantum wormhole tee" />);

    await waitFor(() => {
      expect(screen.getAllByText(/\$?\s*59\.99/).length).toBeGreaterThan(0);
    });
  });
});
