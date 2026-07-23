import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StudioPage from './page';
import { Providers } from '../../components/Providers';

let mockSearchParams = new URLSearchParams();

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
    useSearchParams: () => mockSearchParams,
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
    mockSearchParams = new URLSearchParams();
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

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(screen.getByText(/earn 45% on creator-linked sales/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upgrade to Premium Creator' })).toHaveAttribute(
      'href',
      '/profile?upgrade=premium-creator',
    );
    expect(screen.getByRole('link', { name: 'Manage Saved Images' })).toHaveAttribute(
      'href',
      '/profile#saved-generations',
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

  it('shows Reddit, Discord, and RSS inside the Multi-Channel Poster', async () => {
    await renderStudioPage();

    expect(screen.getByText('@reddit_user')).toBeInTheDocument();
    expect(screen.getByText('@Discord connected')).toBeInTheDocument();
    expect(screen.getByText('@RSS feed')).toBeInTheDocument();
  });

  it('hydrates shared poster params into the Studio multiposter section', async () => {
    localStorage.clear();
    mockSearchParams = new URLSearchParams({
      shareImage: 'https://example.com/shared-image.png',
      shareText: 'Shared text from customize',
      sharePrompt: 'Dragapult',
    });

    const scrollIntoViewMock = vi.fn();
    vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (id === 'multi-channel-poster') {
        return { scrollIntoView: scrollIntoViewMock } as unknown as HTMLElement;
      }
      return null;
    });

    await renderStudioPage();

    expect(screen.getByDisplayValue('Shared text from customize')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Dragapult')).toBeInTheDocument();
    expect(screen.getByAltText('Attached preview')).toHaveAttribute('src', 'https://example.com/shared-image.png');

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('sends the default Reddit subreddit in the poster payload', async () => {
    localStorage.clear();
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
            discord: { authenticated: false },
            rss: { authenticated: false },
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
      if (url.includes('/api/post')) {
        return {
          ok: true,
          status: 200,
          headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
          json: async () => ({ success: true }),
        } as Response;
      }
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }) as typeof fetch;

    await renderStudioPage();

    const posterTextarea = screen.getByPlaceholderText("What's on your mind? #Web3") as HTMLTextAreaElement;
    fireEvent.change(posterTextarea, { target: { value: 'Check out these Reddit links' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post to All Channels' }));

    await waitFor(() => {
      expect(
        (global.fetch as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> } }).mock.calls.some((c) =>
          String(c[0]).includes('/api/post'),
        ),
      ).toBe(true);
    });

    const postCall = (
      global.fetch as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> } }
    ).mock.calls.find((c) => String(c[0]).includes('/api/post'));
    const body = JSON.parse(String(postCall?.[1]?.body || '{}')) as {
      metadata?: { redditSubreddit?: string };
      platforms?: string[];
    };

    expect(body.platforms).toContain('reddit');
    expect(body.metadata?.redditSubreddit).toBe('LivestreamFail');
  });

  it('shows a specific image-source error for a broken same-origin shared image', async () => {
    localStorage.clear();
    const brokenImageUrl = `${window.location.origin}/api/fusion-image?path=%2Fuploads%2Fbroken.png`;
    mockSearchParams = new URLSearchParams({
      shareImage: brokenImageUrl,
      shareText: 'Shared text from customize',
      sharePrompt: 'Dragapult',
    });

    vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (id === 'multi-channel-poster') {
        return { scrollIntoView: vi.fn() } as unknown as HTMLElement;
      }
      return null;
    });

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
            discord: { authenticated: false },
            rss: { authenticated: false },
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
      if (url === brokenImageUrl) {
        return {
          ok: false,
          status: 502,
          headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
          json: async () => ({ success: false, error: 'upstream fetch failed' }),
        } as Response;
      }
      if (url.includes('/api/post')) {
        return {
          ok: true,
          status: 200,
          headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
          json: async () => ({ success: true }),
        } as Response;
      }
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }) as typeof fetch;

    await renderStudioPage();

    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement');
    createElementSpy.mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === 'img') {
        let onload: null | (() => void) = null;
        let onerror: null | (() => void) = null;
        return {
          width: 0,
          height: 0,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          set onload(handler: null | (() => void)) {
            onload = handler;
          },
          get onload() {
            return onload;
          },
          set onerror(handler: null | (() => void)) {
            onerror = handler;
          },
          get onerror() {
            return onerror;
          },
          set src(_value: string) {
            queueMicrotask(() => {
              onerror?.();
            });
          },
          get src() {
            return '';
          },
          crossOrigin: '',
        } as unknown as HTMLImageElement;
      }
      return originalCreateElement(tagName);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Post to All Channels' }));

    await waitFor(() => {
      expect(screen.getByText('Posting failed: Image source unavailable: upstream fetch failed')).toBeInTheDocument();
    });
    expect(
      (global.fetch as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> } }).mock.calls.some((c) =>
        String(c[0]).includes('/api/post'),
      ),
    ).toBe(false);
  });

  it('logs a warning instead of a false success when the build trigger returns unauthorized', async () => {
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
      if (url.includes('/api/generate/image')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            image_url: 'https://example.com/generated.png',
            data: { requestId: 'req_123' },
          }),
        } as Response;
      }
      if (url.includes('/api/content-factory')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            items: [{ text_content: 'Generated post copy' }],
          }),
        } as Response;
      }
      if (url.includes('/api/gallery')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            item: { id: 'gallery_1', imageUrl: 'https://example.com/generated.png' },
          }),
        } as Response;
      }
      if (url.includes('/api/build')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            success: false,
            error: 'unauthorized',
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }) as typeof fetch;

    await renderStudioPage();

    const textarea = screen.getByPlaceholderText('Describe the image and post content you want to generate...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'quantum wormhole fractal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Standard Asset & Content' }));

    await waitFor(() => {
      expect(screen.getByText(/failed to trigger build pipeline: unauthorized/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Build pipeline triggered successfully')).not.toBeInTheDocument();
  });
});
