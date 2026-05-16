import { test, expect } from '@playwright/test';
import { customerProfiles } from './fixtures/customerProfiles';
import {
  clearCart,
  ensureDeviceId,
  expectPageLoadUnder,
  mockCheckout,
  mockCryptoConfig,
  mockNftClaim,
  mockOrdersForSession,
  mockQuantumStatus,
  mockShippingQuote,
  mockStripeWebhook,
  seedCartItem,
} from './helpers';

test.describe('Customer Journey (Browse → Cart → Checkout → Post-Purchase)', () => {
  test.beforeEach(async ({ page }) => {
    const deviceId = await ensureDeviceId(page);
    await clearCart(page, deviceId);
  });

  test('navigation + browsing + search filters work', async ({ page }) => {
    await expectPageLoadUnder(page, '/', 40_000);

    await expect(page.getByRole('heading', { name: 'Latest Drops' })).toBeVisible();
    await expect(page.getByPlaceholder('Search assets...')).toBeVisible();

    const buyNow = page.locator('[data-testid="buy-now"]');
    await expect(buyNow.first()).toBeVisible({ timeout: 20_000 });

    await page.getByPlaceholder('Search assets...').fill('zzzzzz-no-match');
    await expect(buyNow).toHaveCount(0, { timeout: 20_000 });
    await page.getByPlaceholder('Search assets...').fill('');
    await expect(buyNow.first()).toBeVisible({ timeout: 20_000 });

    const filterToggle = page.locator('button[aria-haspopup="true"]').filter({ hasText: 'Filter' });
    await filterToggle.click();
    await expect(page.getByText('Asset Type')).toBeVisible();
    await page.getByLabel('Images Only').check();
    await page.keyboard.press('Escape');

    await expect(buyNow.first()).toBeVisible();
  });

  test('cart operations: add item → view cart → remove item', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const deviceId = await ensureDeviceId(page);
    await seedCartItem(page, deviceId);

    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Shopping Cart' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('checkout-link')).toBeVisible();

    const clearBtn = page.getByTestId('clear-cart');
    await expect(clearBtn).toBeVisible({ timeout: 20_000 });
    await clearBtn.click();
    await expect(page.getByText('Your cart is empty')).toBeVisible({ timeout: 20_000 });
  });

  test('guest checkout + payment redirect + success + NFT claim', async ({ page }) => {
    const sessionId = `cs_test_${Date.now()}`;
    await mockShippingQuote(page);
    await mockQuantumStatus(page, { available: true });
    await mockCheckout(page, { sessionId });
    await mockStripeWebhook(page);
    await mockOrdersForSession(page, { sessionId, printifyOrderId: 'printify_e2e_001' });
    await mockCryptoConfig(page);
    await mockNftClaim(page, { txHash: '0xe2e_tx', metadataIpfsUrl: 'https://ipfs.io/ipfs/bafy-e2e' });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const deviceId = await ensureDeviceId(page);
    await seedCartItem(page, deviceId);
    await page.goto('/cart');
    await page.getByTestId('checkout-link').click();
    await page.waitForURL('**/checkout', { timeout: 20_000 });

    await page.getByRole('button', { name: 'Continue as Guest' }).click();
    await expect(page.getByTestId('checkout-form')).toBeVisible({ timeout: 20_000 });

    const p = customerProfiles[0]!;
    await page.getByTestId('input-name').fill(p.name);
    await page.getByTestId('input-email').fill(p.email);
    await page.getByTestId('input-phone').fill(p.phone);
    if (p.qrUrl) await page.getByTestId('input-qr-url').fill(p.qrUrl);
    await page.getByTestId('input-address').fill(p.address);
    await page.getByTestId('input-address2').fill(p.address2 || '');
    await page.getByTestId('input-country').fill(p.country);
    await page.getByTestId('input-city').fill(p.city);
    await page.getByTestId('input-region').fill(p.region);
    await page.getByTestId('input-zip').fill(p.zip);

    await expect(page.getByRole('heading', { name: 'Shipping Options' })).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('submit-payment').click();

    await page.waitForURL('**/checkout/success?session_id=*', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Payment Successful!' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Order finalize (dev)')).toBeVisible();
    await expect(page.getByText('Printify Order ID: printify_e2e_001')).toBeVisible({ timeout: 20_000 });

    await page.getByPlaceholder('0x...').fill(p.walletAddress);
    const claimBtn = page.getByRole('button', { name: 'Claim' });
    await expect(claimBtn).toBeEnabled();
    await claimBtn.click();
    await expect(page.getByText(/Tx: 0xe2e_tx/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Metadata: https:\/\/ipfs\.io\/ipfs\/bafy-e2e/)).toBeVisible({ timeout: 20_000 });
  });

  test('checkout shows user-facing error when shipping quote fails', async ({ page }) => {
    await mockShippingQuote(page, { error: 'invalid_zip' });
    await mockQuantumStatus(page, { available: true });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const deviceId = await ensureDeviceId(page);
    await seedCartItem(page, deviceId);
    await page.goto('/cart');
    await page.getByTestId('checkout-link').click();
    await page.waitForURL('**/checkout', { timeout: 20_000 });
    await page.getByRole('button', { name: 'Continue as Guest' }).click();

    await page.getByTestId('input-country').fill('US');
    await page.getByTestId('input-zip').fill('00000');
    await page.getByTestId('input-city').fill('Nowhere');
    await page.getByTestId('input-region').fill('CA');
    await page.getByTestId('input-name').fill('Ship Error');
    await page.getByTestId('input-email').fill('ship.error@example.com');
    await page.getByTestId('input-phone').fill('+15550199999');
    await page.getByTestId('input-address').fill('1 Broken Rd');

    await expect(page.getByText(/Shipping:\s*invalid_zip/)).toBeVisible({ timeout: 20_000 });
  });
});
