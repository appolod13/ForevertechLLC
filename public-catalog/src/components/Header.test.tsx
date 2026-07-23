import '@testing-library/jest-dom/vitest';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { Header } from './Header';

const pushMock = vi.fn();
const logoutMock = vi.fn();
const useAuthMock = vi.fn();
const useCartMock = vi.fn();
const usePathnameMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/context/CartContext', () => ({
  useCart: () => useCartMock(),
}));

vi.mock('./LiveBadge', () => ({
  LiveBadge: () => <div>Live</div>,
}));

describe('Header', () => {
  beforeEach(() => {
    pushMock.mockReset();
    logoutMock.mockReset();
    usePathnameMock.mockReturnValue('/studio');
    useCartMock.mockReturnValue({ itemCount: 0 });
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', name: 'Test User' },
      logout: logoutMock,
    });
    global.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ success: false }),
    })) as typeof fetch;
  });

  it('shows a manage storage shortcut for signed-in users', async () => {
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Manage Storage' })).toHaveAttribute(
        'href',
        '/profile#saved-generations',
      );
    });
  });

  it('does not emit duplicate key warnings for studio navigation items', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Navigate' })).toBeInTheDocument();
    });

    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Encountered two children with the same key'),
    );

    errorSpy.mockRestore();
  });
});
