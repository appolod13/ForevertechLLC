import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { CatalogItem } from './CatalogItem';

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({
    addToCart: vi.fn(async () => {}),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      whileInView: _whileInView,
      whileHover: _whileHover,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { whileInView?: unknown; whileHover?: unknown }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('CatalogItem', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        href: 'http://localhost/gallery',
        origin: 'http://localhost',
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('shows the buyer preview and Printify sample in the product preview modal', () => {
    render(
      <CatalogItem
        id="catalog-1"
        content="quantum skyline shirt"
        mediaUrl="https://example.com/design.png"
        timestamp="2026-07-06T00:00:00.000Z"
        metadata={{
          title: 'Quantum Skyline Tee',
          prompt: 'quantum skyline shirt',
          printType: 'all_over_print',
          printifyPreviewUrl: 'https://printify.example/catalog-sample.png',
        }}
      />,
    );

    fireEvent.click(screen.getByTitle('Preview Image'));

    expect(screen.getByText('Buyer Preview')).toBeInTheDocument();
    expect(screen.getAllByText('Printify Sample').length).toBeGreaterThan(0);
    expect(screen.getByText('AOP Ready')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Printify sample' })).toHaveAttribute(
      'href',
      'https://printify.example/catalog-sample.png',
    );
  });

  it('routes send-to-poster actions to the Studio multiposter section', () => {
    render(
      <CatalogItem
        id="catalog-2"
        content="Dragapult poster drop"
        mediaUrl="https://example.com/design.png"
        timestamp="2026-07-20T00:00:00.000Z"
        metadata={{
          title: 'Dragapult Tee',
          prompt: 'Dragapult',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send to Multi-Channel Poster' }));

    const parsed = new URL(window.location.href);
    expect(parsed.pathname).toBe('/studio');
    expect(parsed.searchParams.get('shareImage')).toBe('https://example.com/design.png');
    expect(parsed.searchParams.get('sharePrompt')).toBe('Dragapult');
  });
});
