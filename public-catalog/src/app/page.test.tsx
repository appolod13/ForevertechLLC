import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import Home from './page';

vi.mock('@/components/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('@/components/CatalogGrid', () => ({
  CatalogGrid: () => <div>Catalog Grid</div>,
}));

vi.mock('@/components/TwitterFeed', () => ({
  TwitterFeed: () => <div>Twitter Feed</div>,
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    readdirSync: vi.fn(() => []),
  },
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
}));

describe('Home page', () => {
  it('uses customer-first hero copy and entry actions', async () => {
    render(await Home());

    expect(screen.getByRole('heading', { name: /create your one-of-one fractal tee/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start Creating' })).toHaveAttribute('href', '/studio');
    expect(screen.getByRole('link', { name: 'Browse Gallery' })).toHaveAttribute('href', '/gallery');
  });
});
