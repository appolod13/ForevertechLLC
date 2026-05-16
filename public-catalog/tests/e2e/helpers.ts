import { expect, type Page } from '@playwright/test';

type MockUser = { id: string; name: string; email: string };

export async function ensureDeviceId(page: Page): Promise<string> {
  if (page.url() === 'about:blank') {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  }
  const deviceId = await page.evaluate(() => {
    const existing = localStorage.getItem('device_id');
    if (existing) return existing;
    const next = 'e2e-device';
    localStorage.setItem('device_id', next);
    return next;
  });
  await expect(page.locator('a[href="/cart"]')).toBeVisible({ timeout: 20_000 });
  expect(deviceId).toBeTruthy();
  return deviceId;
}

export async function clearCart(page: Page, deviceId: string) {
  await page.evaluate(async (id) => {
    await fetch('/api/cart/clear', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId: id }),
    }).catch(() => null);
  }, deviceId);
}

export async function seedCartItem(page: Page, deviceId: string) {
  await page.evaluate(async (id) => {
    await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        deviceId: id,
        item: {
          id: 'e2e-item-1',
          title: 'E2E Tee (Size: L)',
          price: 49.99,
          quantity: 1,
          currency: 'usd',
          size: 'L',
          imageUrl: '/placeholder-future-city.svg',
          description: 'Seeded cart item for E2E flow',
        },
      }),
    }).catch(() => null);
  }, deviceId);
}

export async function setLoggedInUser(page: Page, user: MockUser) {
  await page.addInitScript((u: MockUser) => {
    localStorage.setItem('user', JSON.stringify(u));
  }, user);
}

export async function mockAuthApi(page: Page, opts: { mode: 'success' | 'error'; user?: MockUser; errorMessage?: string }) {
  const user: MockUser = opts.user || { id: 'usr_e2e_1', name: 'E2E User', email: 'e2e.user@example.com' };
  const errorMessage = opts.errorMessage || 'Invalid credentials';

  await page.route('**/api/auth/login', async (route) => {
    if (opts.mode === 'success') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user }),
      });
      return;
    }
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: errorMessage }),
    });
  });

  await page.route('**/api/auth/register', async (route) => {
    if (opts.mode === 'success') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user }),
      });
      return;
    }
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: errorMessage }),
    });
  });
}

export async function mockCartApi(page: Page) {
  const state: { items: Array<Record<string, unknown>> } = { items: [] };

  await page.route('**/api/cart?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, items: state.items }),
    });
  });

  await page.route('**/api/cart/add', async (route) => {
    const body = (() => {
      try {
        return route.request().postDataJSON() as Record<string, unknown>;
      } catch {
        return {};
      }
    })();
    const item = (body.item && typeof body.item === 'object') ? (body.item as Record<string, unknown>) : null;
    if (item && typeof item.id === 'string') {
      const existing = state.items.find((x) => x && x.id === item.id);
      if (existing) {
        const q0 = typeof existing.quantity === 'number' ? existing.quantity : 1;
        const q1 = typeof item.quantity === 'number' ? item.quantity : 1;
        existing.quantity = q0 + q1;
      } else {
        state.items.push({ ...item, quantity: typeof item.quantity === 'number' ? item.quantity : 1 });
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/api/cart/remove', async (route) => {
    const body = (() => {
      try {
        return route.request().postDataJSON() as Record<string, unknown>;
      } catch {
        return {};
      }
    })();
    const itemId = typeof body.itemId === 'string' ? body.itemId : '';
    if (itemId) state.items = state.items.filter((x) => x && x.id !== itemId);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/api/cart/clear', async (route) => {
    state.items = [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  return state;
}

export async function mockShippingQuote(page: Page, opts?: { error?: string }) {
  await page.route('**/api/shipping/quote', async (route) => {
    if (opts?.error) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: opts.error }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          options: [
            { id: 'std', label: 'Standard', amountUsd: 5.99, eta: '5-8 business days' },
            { id: 'exp', label: 'Express', amountUsd: 14.99, eta: '2-3 business days' },
          ],
        },
      }),
    });
  });
}

export async function mockQuantumStatus(page: Page, opts?: { available?: boolean; reason?: string }) {
  await page.route('**/api/quantum/status', async (route) => {
    const available = opts?.available ?? true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { available, reason: opts?.reason || '' },
      }),
    });
  });
}

export async function mockCheckout(page: Page, opts: { sessionId: string; redirectUrl?: string; error?: string }) {
  await page.route('**/api/checkout', async (route) => {
    if (opts.error) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: opts.error }),
      });
      return;
    }
    const url = opts.redirectUrl || `/checkout/success?session_id=${encodeURIComponent(opts.sessionId)}`;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url }),
    });
  });
}

export async function mockStripeWebhook(page: Page) {
  await page.route('**/api/stripe/webhook', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}

export async function mockOrdersForSession(page: Page, opts: { sessionId: string; printifyOrderId?: string }) {
  await page.route('**/api/orders**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/orders') && route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          orders: [
            {
              id: 'ord_e2e_1',
              createdAt: new Date().toISOString(),
              status: 'submitted',
              total: 55.98,
              stripeSessionId: opts.sessionId,
              printifyOrderId: opts.printifyOrderId || 'printify_dev_123',
              items: [
                { id: 'sku_1', title: 'E2E Tee (Size: L)', quantity: 1, price: 49.99, imageUrl: '/placeholder-future-city.svg' },
              ],
            },
          ],
        }),
      });
      return;
    }
    await route.fallback();
  });
}

export async function mockCryptoConfig(page: Page) {
  await page.route('**/api/crypto/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          version: 'e2e',
          primaryChainId: 56,
          chains: [
            {
              id: 'bsc',
              name: 'BSC',
              chainId: 56,
              enabled: true,
              gaslessClaim: true,
              contractAddress: '0x0000000000000000000000000000000000000000',
              mintFunction: 'mint',
            },
          ],
        },
      }),
    });
  });
}

export async function mockNftClaim(page: Page, opts?: { txHash?: string; metadataIpfsUrl?: string }) {
  await page.route('**/api/nft/claim', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          txHash: opts?.txHash || '0xdeadbeef',
          metadataIpfsUrl: opts?.metadataIpfsUrl || 'https://ipfs.io/ipfs/bafy-e2e-metadata',
        },
      }),
    });
  });
}

export async function expectPageLoadUnder(page: Page, url: string, maxMs: number) {
  const start = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(maxMs);
}
