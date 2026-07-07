import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StudioPage from './page';
import { Providers } from '../../components/Providers';

vi.mock('sonner', () => ({
  Toaster: () => null,
}));

vi.mock('../../components/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('../../components/DataDashboardButton', () => ({
  DataDashboardButton: () => <button type="button">Dashboard</button>,
}));

vi.mock('../../components/FusionAI', () => ({
  FusionAI: () => <div>FusionAI</div>,
}));

vi.mock('../../components/LatestAIImage', () => ({
  LatestAIImage: ({
    overrideUrl,
    onResolvedUrl,
  }: {
    overrideUrl?: string;
    onResolvedUrl?: (url: string | null) => void;
  }) => {
    React.useEffect(() => {
      onResolvedUrl?.(overrideUrl || 'https://example.com/latest-build.png');
    }, [overrideUrl, onResolvedUrl]);

    return <div>LatestAIImage</div>;
  },
}));

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    usePathname: () => '/',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(<Providers>{ui}</Providers>);
}

async function renderStudioPage() {
  renderWithProviders(<StudioPage />);
  await waitFor(() => {
    expect(screen.getByText('AI Asset Generator')).toBeInTheDocument();
  });
  await waitFor(() => {
    expect(
      (global.fetch as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> } }).mock.calls.some((c) =>
        String(c[0]).includes('/api/printify/mockups'),
      ),
    ).toBe(true);
  });
}

class EventSourceMock {
  close() {}
  addEventListener() {}
}

describe('StudioPage calendar date range', () => {
  beforeEach(() => {
    vi.stubGlobal('EventSource', EventSourceMock);
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/auth/session')) {
        return {
          ok: true,
          json: async () => ({
            twitter: { authenticated: false },
            telegram: { authenticated: false },
            instagram: { authenticated: false },
            tiktok: { authenticated: false },
            youtube: { authenticated: false },
          }),
        } as Response;
      }
      if (url.includes('/api/chat/history')) {
        return { ok: true, json: async () => ({ success: true, data: { messages: [] } }) } as Response;
      }
      if (url.includes('/api/catalog/posts')) {
        return { ok: true, json: async () => ({ posts: [] }) } as Response;
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
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }) as typeof fetch;
  });

  it('renders the asset generator UI', async () => {
    await renderStudioPage();
    expect(screen.getByText('Creator Studio')).toBeDefined();
    expect(screen.getByText('AI Asset Generator')).toBeDefined();
    expect(screen.getByPlaceholderText('Describe the image and post content you want to generate...')).toBeDefined();
  });

  it('disables generate button until prompt is entered', async () => {
    await renderStudioPage();
    const btn = screen.getByRole('button', { name: 'Generate Standard Asset & Content' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    const textarea = screen.getByPlaceholderText('Describe the image and post content you want to generate...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'quantum wormhole fractal' } });
    expect(btn.disabled).toBe(false);
  });

  it('renders standard and real quantum generation modes', async () => {
    await renderStudioPage();
    expect(screen.getByLabelText('Standard Generation')).toBeInTheDocument();
    expect(screen.getByLabelText('Real Quantum Generation - $9.99')).toBeInTheDocument();
  });

  it('switches to the paid unlock flow for real quantum generation', async () => {
    await renderStudioPage();
    const textarea = screen.getByPlaceholderText('Describe the image and post content you want to generate...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'quantum wormhole fractal' } });

    const standard = screen.getByLabelText('Standard Generation') as HTMLInputElement;
    const quantum = screen.getByLabelText('Real Quantum Generation - $9.99') as HTMLInputElement;
    const ipfs = screen.getByLabelText('Public Link Upload') as HTMLInputElement;

    expect(standard.checked).toBe(true);
    expect(quantum.checked).toBe(false);
    expect(ipfs.checked).toBe(false);

    fireEvent.click(quantum);
    fireEvent.click(ipfs);

    expect(standard.checked).toBe(false);
    expect(quantum.checked).toBe(true);
    expect(ipfs.checked).toBe(true);
    expect(screen.getByRole('button', { name: 'Unlock Real Quantum Generation - $9.99' })).toBeInTheDocument();
  });

  it('shows a separate premium creator upgrade path', async () => {
    await renderStudioPage();
    expect(screen.getByText('Premium Creator - $24.99/month')).toBeInTheDocument();
    expect(screen.getByText(/earn 75% on creator-linked sales/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upgrade to Premium Creator' })).toHaveAttribute(
      'href',
      '/profile?upgrade=premium-creator',
    );
  });

  it('shows the approved merch buyer preview for the latest generated image', async () => {
    localStorage.setItem(
      'foreverteck.studio.lastImage',
      JSON.stringify({
        imageUrl: 'https://example.com/latest-build.png',
        prompt: 'quantum skyline tee',
      }),
    );

    await renderStudioPage();

    await waitFor(() => {
      expect(screen.getByText('Buyer Preview')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Printify Sample').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'No Printify sample image is linked yet. The finished product mockup above still shows the buyer what the shirt looks like before purchase.',
      ),
    ).toBeInTheDocument();
  });
});
