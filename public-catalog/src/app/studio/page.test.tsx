import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StudioPage from './page';
import { Providers } from '../../components/Providers';

let latestAiImageResolvedUrlOverride: string | null = null;

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

vi.mock('../../components/MerchPreviewPanel', () => ({
  MerchPreviewPanel: () => (
    <div>
      <div>Buyer Preview</div>
      <div>Printify Sample</div>
      <div>
        No Printify sample image is linked yet. The finished product mockup above still shows the buyer what the shirt looks like before purchase.
      </div>
    </div>
  ),
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
      onResolvedUrl?.((latestAiImageResolvedUrlOverride ?? overrideUrl) || 'https://example.com/latest-build.png');
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
}

class EventSourceMock {
  close() {}
  addEventListener() {}
}

describe('StudioPage calendar date range', () => {
  beforeEach(() => {
    latestAiImageResolvedUrlOverride = null;
    localStorage.clear();
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
            reddit: { authenticated: true, screenName: 'reddit_user' },
            discord: { authenticated: true, screenName: 'Discord connected' },
            rss: { authenticated: true, screenName: 'RSS feed' },
          }),
        } as Response;
      }
      if (url.includes('/api/social/discord')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            connected: true,
            webhookDisplay: 'https://discord.com/.../abc...xyz',
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

  it('loads live multichannel poster connection state in Studio', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', name: 'Poster User' }));
    await renderStudioPage();

    const calls = (global.fetch as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> } }).mock.calls;
    const calledUrls = calls.map((c) => String(c[0]));

    expect(calledUrls.some((url) => url.includes('/api/auth/session?userId=user-1'))).toBe(true);
    expect(calledUrls.some((url) => url.includes('/api/chat/history'))).toBe(false);
    expect(calledUrls.some((url) => url.includes('/api/catalog/posts'))).toBe(false);
  });

  it('keeps the main creation flow and restores the multichannel poster as a secondary section', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', name: 'Poster User' }));
    await renderStudioPage();

    expect(screen.getByText('Latest Build Preview')).toBeInTheDocument();
    expect(screen.getByText('Multichannel Poster')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Connections' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post to All Channels' })).toBeInTheDocument();
    expect(screen.getByText('Reddit connected')).toBeInTheDocument();
    expect(screen.getByText('Discord connected')).toBeInTheDocument();
    expect(screen.getByText('RSS available')).toBeInTheDocument();
    expect(screen.queryByText('Live Chat')).not.toBeInTheDocument();
  });

  it('publishes the latest generated content through the restored multichannel poster', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', name: 'Poster User' }));
    localStorage.setItem(
      'foreverteck.studio.lastImage',
      JSON.stringify({
        imageUrl: 'https://example.com/latest-build.png',
        prompt: 'quantum skyline tee',
      }),
    );

    const fetchMock = global.fetch as unknown as {
      mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> };
    };

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
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
            reddit: { authenticated: true, screenName: 'reddit_user' },
            discord: { authenticated: true, screenName: 'Discord connected' },
            rss: { authenticated: true, screenName: 'RSS feed' },
          }),
        } as Response;
      }
      if (url.includes('/api/post')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            results: {
              reddit: { success: true },
              discord: { success: true },
              rss: { success: true },
            },
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
      return { ok: true, json: async () => ({ success: true }) } as Response;
    });

    await renderStudioPage();

    const posterCopy = screen.getByLabelText('Poster Copy') as HTMLTextAreaElement;
    fireEvent.change(posterCopy, { target: { value: 'Quantum drop is live' } });
    fireEvent.click(screen.getByLabelText('Post to Reddit'));
    fireEvent.click(screen.getByLabelText('Post to Discord'));
    fireEvent.click(screen.getByLabelText('Post to RSS'));
    fireEvent.click(screen.getByRole('button', { name: 'Post to All Channels' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/api/post'))).toBe(true);
    });

    const postCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/api/post'));
    expect(postCall).toBeDefined();
    expect(postCall?.[1]?.method).toBe('POST');
    expect(postCall?.[1]?.body).toEqual(
      JSON.stringify({
        userId: 'user-1',
        content: 'Quantum drop is live',
        platforms: ['reddit', 'discord', 'rss'],
        metadata: {
          mediaUrl: 'https://example.com/latest-build.png',
        },
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('reddit: success')).toBeInTheDocument();
      expect(screen.getByText('discord: success')).toBeInTheDocument();
      expect(screen.getByText('rss: success')).toBeInTheDocument();
    });
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

  it('keeps the real generated image when LatestAIImage resolves to a placeholder svg', async () => {
    latestAiImageResolvedUrlOverride =
      'data:image/svg+xml;base64,PHN2Zz48dGV4dD5BSSBJbWFnZTwvdGV4dD48L3N2Zz4=';
    localStorage.setItem(
      'foreverteck.studio.lastImage',
      JSON.stringify({
        imageUrl: 'https://example.com/real-generated.png',
        prompt: 'metallic dim fractal',
      }),
    );

    await renderStudioPage();

    const customizeLink = await screen.findByRole('link', { name: 'Customize Your Gear' });
    expect(customizeLink).toHaveAttribute('href', expect.stringContaining(encodeURIComponent('https://example.com/real-generated.png')));
    expect(customizeLink).not.toHaveAttribute('href', expect.stringContaining(encodeURIComponent('data:image/svg+xml')));
  });

  it('shows free session count from stored generation session', async () => {
    localStorage.setItem(
      'foreverteck.studio.generationSession',
      JSON.stringify({
        generation_count: 7,
        reset_version: 1,
        family_bias_seed: 123,
        bad_output_streak: 0,
      }),
    );

    await renderStudioPage();

    expect(screen.getByText('Free session: 7/20')).toBeInTheDocument();
  });

  it('shows reset generator action at the free limit and clears preview state when clicked', async () => {
    localStorage.setItem(
      'foreverteck.studio.lastImage',
      JSON.stringify({
        imageUrl: 'https://example.com/latest-build.png',
        prompt: 'quantum skyline tee',
      }),
    );
    localStorage.setItem(
      'foreverteck.studio.generationSession',
      JSON.stringify({
        generation_count: 20,
        reset_version: 2,
        family_bias_seed: 123,
        bad_output_streak: 1,
      }),
    );

    await renderStudioPage();

    const resetButton = screen.getByRole('button', { name: 'Reset Generator' });
    expect(resetButton).toBeInTheDocument();
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Customize Your Gear' })).not.toBeInTheDocument();
    });
    expect(localStorage.getItem('foreverteck.studio.lastImage')).toBeNull();
  });
});
