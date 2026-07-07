import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
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
          printifyPreviewUrl: 'https://printify.example/catalog-sample.png',
        }}
      />,
    );

    fireEvent.click(screen.getByTitle('Preview Image'));

    expect(screen.getByText('Buyer Preview')).toBeInTheDocument();
    expect(screen.getAllByText('Printify Sample').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Open Printify sample' })).toHaveAttribute(
      'href',
      'https://printify.example/catalog-sample.png',
    );
  });
});
