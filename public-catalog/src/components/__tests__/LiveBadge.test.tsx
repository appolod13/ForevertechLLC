
import { render, screen, cleanup } from '@testing-library/react';
import { LiveBadge } from '../LiveBadge';
import { useLiveStatus } from '@/context/LiveStatusContext';
import { describe, it, expect, vi, afterEach, Mock } from 'vitest';

// Mock the context hook
vi.mock('@/context/LiveStatusContext', () => ({
  useLiveStatus: vi.fn(),
}));

describe('LiveBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders "Connecting..." when not connected', () => {
    (useLiveStatus as Mock).mockReturnValue({ isConnected: false });
    render(<LiveBadge />);
    expect(screen.getByText('Connecting...')).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('renders "Live Updates" when connected', () => {
    (useLiveStatus as Mock).mockReturnValue({ isConnected: true });
    render(<LiveBadge />);
    expect(screen.getByText('Live Updates')).toBeDefined();
  });

  it('has correct accessibility attributes', () => {
    (useLiveStatus as Mock).mockReturnValue({ isConnected: true });
    render(<LiveBadge />);
    const badge = screen.getByRole('status');
    expect(badge.getAttribute('aria-live')).toBe('polite');
    expect(badge.getAttribute('aria-label')).toBe('System Online');
  });
});
