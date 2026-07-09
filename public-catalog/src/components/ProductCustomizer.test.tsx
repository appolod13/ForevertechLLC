import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  let originalLocation: Location;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        href: 'http://localhost/customize',
        origin: 'http://localhost',
      },
    });
    useRouterMock.mockReturnValue({
      back: vi.fn(),
    });

    global.fetch = vi.fn(async () => {
      throw new Error('products unavailable');
    }) as typeof fetch;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('shows $59.99 pricing in the fallback merch product', async () => {
    render(<ProductCustomizer initialImageUrl="https://example.com/design.png" promptOverride="quantum wormhole tee" />);

    await waitFor(() => {
      expect(screen.getAllByText(/\$?\s*59\.99/).length).toBeGreaterThan(0);
    });
  });

  it('shows an all-over-print option with overview and 360 preview tabs', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        products: [
          {
            id: 'tee',
            name: 'Premium Tee',
            description: 'Premium cotton tee printed on-demand.',
            basePrice: 59.99,
            currency: 'usd',
            variants: ['S', 'M', 'L'],
            colors: ['Black', 'White'],
            image: '',
            printType: 'standard',
            previewMode: 'flat',
            placementMode: 'single_front_with_back_optional',
            surfaces: ['front', 'back', 'overview', 'spin360'],
            printifySkus: { S: 'sku-standard-s', M: 'sku-standard-m', L: 'sku-standard-l' },
          },
          {
            id: 'tee-aop',
            name: 'All-over-print Tee',
            description: 'Cut-and-sew all-over-print premium shirt.',
            basePrice: 74.99,
            currency: 'usd',
            variants: ['S', 'M', 'L'],
            colors: ['Black', 'Midnight'],
            image: '',
            printType: 'all_over_print',
            previewMode: 'aop',
            placementMode: 'all_over_print',
            surfaces: ['front', 'back', 'overview', 'spin360'],
            printifySkus: { S: 'sku-aop-s', M: 'sku-aop-m', L: 'sku-aop-l' },
          },
        ],
      }),
    }) as Response) as typeof fetch;

    render(<ProductCustomizer initialImageUrl="https://example.com/design.png" promptOverride="quantum wormhole tee" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all-over-print tee/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '360 Preview' })).toBeInTheDocument();
  });

  it('shows a finished product preview and a Printify sample section before checkout', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/products')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            products: [
              {
                id: 'tee',
                name: 'Premium Tee',
                description: 'Premium cotton tee printed on-demand.',
                basePrice: 59.99,
                currency: 'usd',
                variants: ['S', 'M', 'L'],
                colors: ['Black', 'White'],
                image: '',
                printType: 'standard',
                previewMode: 'flat',
                placementMode: 'single_front_with_back_optional',
                surfaces: ['front', 'back', 'overview', 'spin360', 'finished'],
                printifyPreviewUrl: 'https://printify.example/mockup.png',
                printifySkus: { S: 'sku-standard-s', M: 'sku-standard-m', L: 'sku-standard-l' },
              },
            ],
          }),
        } as Response;
      }
      if (url.includes('/api/printify/mockups')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            designHash: 'hash_test',
            status: 'pending',
            mockups: { frontUrl: undefined, backUrl: undefined, leftUrl: undefined, rightUrl: undefined },
          }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    render(<ProductCustomizer initialImageUrl="https://example.com/design.png" promptOverride="quantum wormhole tee" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Finished Product' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finished Product' }));

    expect(screen.getByText('Buyer Preview')).toBeInTheDocument();
    expect(screen.getAllByText('Printify Sample').length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole('link', { name: 'Open Printify sample' })
        .every((link) => link.getAttribute('href') === 'https://printify.example/mockup.png'),
    ).toBe(true);
  });

  it('uses a taller mobile preview shell for the finished product view', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/products')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            products: [
              {
                id: 'tee',
                name: 'Premium Tee',
                description: 'Premium cotton tee printed on-demand.',
                basePrice: 59.99,
                currency: 'usd',
                variants: ['S', 'M', 'L'],
                colors: ['Black', 'White'],
                image: '',
                printType: 'standard',
                previewMode: 'flat',
                placementMode: 'single_front_with_back_optional',
                surfaces: ['front', 'back', 'overview', 'spin360', 'finished'],
                printifySkus: { S: 'sku-standard-s', M: 'sku-standard-m', L: 'sku-standard-l' },
              },
            ],
          }),
        } as Response;
      }
      if (url.includes('/api/printify/mockups')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            designHash: 'hash_test',
            status: 'pending',
            mockups: { frontUrl: undefined, backUrl: undefined, leftUrl: undefined, rightUrl: undefined },
          }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    render(<ProductCustomizer initialImageUrl="https://example.com/design.png" promptOverride="quantum wormhole tee" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Finished Product' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finished Product' }));

    const previewShell = screen.getByTestId('preview-shell');
    expect(previewShell.className).toContain('min-h-[');
    expect(previewShell.className).toContain('lg:aspect-square');
  });

  it('routes send-to-poster actions to the dedicated multiposter page', async () => {
    render(<ProductCustomizer initialImageUrl="https://example.com/design.png" promptOverride="quantum wormhole tee" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Send to Multi-Channel Poster' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send to Multi-Channel Poster' }));

    const parsed = new URL(window.location.href);
    expect(parsed.pathname).toBe('/poster');
    expect(parsed.searchParams.get('shareImage')).toBe('https://example.com/design.png');
    expect(parsed.searchParams.get('sharePrompt')).toBe('quantum wormhole tee');
  });
});
