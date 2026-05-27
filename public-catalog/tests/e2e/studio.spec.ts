import { test, expect } from '@playwright/test';

test.describe('Studio Generate & Import', () => {
  test('generates image and replaces placeholder on import', async ({ page }) => {
    await page.goto('/studio?test=1');

    const postBox = page.getByPlaceholder("What's on your mind? #Web3");
    await expect(postBox).toBeVisible();

    const promptBox = page.getByRole('textbox', { name: /describe the image/i });
    await expect(promptBox).toBeVisible();
    await promptBox.fill('futuristic city skyline at dusk, neon lights, high detail');

    await page.route('**/api/generate/image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          imageUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAAAAABx5D8UAAAAFElEQVR4nGP4z8DwnwEGwAEMCwAAGXgA4p9gB2QAAAAASUVORK5CYII=",
        }),
      });
    });
    await page.route('**/api/content-factory', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, items: [{ text_content: 'E2E: Generated post copy.' }] }),
      });
    });
    await page.route('**/api/gallery', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, item: { id: 'e2e_gallery_1' } }),
      });
    });

    const generateBtn = page.getByRole('button', { name: /Generate Asset/i });
    const start = Date.now();
    await generateBtn.click();

    const generatedImg = page.getByRole('img', { name: 'Latest AI Generated Content' });
    await expect(generatedImg).toBeVisible({ timeout: 20000 });
    const genDuration = Date.now() - start;
    expect(genDuration).toBeLessThan(20000);

    const sendBtn = page.getByRole('button', { name: 'Send to Multi-Channel Poster' });
    await expect(sendBtn).toBeEnabled({ timeout: 20000 });
    await sendBtn.click();

    await expect(postBox).toHaveValue(/E2E: Generated post copy\./, { timeout: 20000 });
    await expect(page.getByRole('img', { name: 'Attached preview' })).toBeVisible({ timeout: 20000 });
  });

  test('generated asset can be previewed on product front and back (banner font present)', async ({ page }, testInfo) => {
    const imageUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAAAAABx5D8UAAAAFElEQVR4nGP4z8DwnwEGwAEMCwAAGXgA4p9gB2QAAAAASUVORK5CYII=";

    await page.goto('/studio?test=1');

    await page.route('**/api/generate/image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, imageUrl }),
      });
    });
    await page.route('**/api/content-factory', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, items: [{ text_content: 'E2E: Generated post copy.' }] }),
      });
    });
    await page.route('**/api/gallery', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, item: { id: 'e2e_gallery_1' } }),
      });
    });
    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          products: [
            {
              id: 'shirt-1',
              name: 'Premium Tee',
              description: 'Cotton Tee',
              basePrice: 49.99,
              currency: 'usd',
              variants: ['S', 'M', 'L', 'XL'],
              colors: ['Black', 'White'],
              image: '',
            },
          ],
        }),
      });
    });

    await page.getByRole('button', { name: /Generate Asset/i }).click();
    await expect(page.getByRole('img', { name: 'Latest AI Generated Content' })).toBeVisible({ timeout: 20000 });

    await page.goto(`/customize?imageUrl=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent('neon city skyline')}`);

    await expect(page.getByRole('heading', { name: 'Customize Your Gear' })).toBeVisible({ timeout: 20000 });

    await expect(page.getByRole('button', { name: 'Front' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();

    await expect(page.getByRole('img', { name: 'Design' })).toBeVisible({ timeout: 20000 });
    await testInfo.attach('customize-front.png', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    await page.getByRole('button', { name: 'Back' }).click();
    const backBanner = page.locator('img[alt^="Back banner:"]');
    await expect(backBanner).toBeVisible({ timeout: 20000 });

    const backBannerSrc = await backBanner.getAttribute('src');
    expect(backBannerSrc).toBeTruthy();
    const encoded = (backBannerSrc || '').split('data:image/svg+xml;utf8,')[1] || '';
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toContain('font-family="Impact');

    await testInfo.attach('customize-back.png', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
});
