import { test, expect } from '@playwright/test';

test.describe('Studio Generate & Import', () => {
  test('generates image and replaces placeholder on import', async ({ page }) => {
    await page.goto('/studio?test=1');

    const postBox = page.getByPlaceholder("What's on your mind? #Web3");
    await expect(postBox).toBeVisible();

    const promptBox = page.locator('textarea[placeholder="Describe the image and post content you want to generate..."]');
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

    const generateBtn = page.getByRole('button', { name: 'Generate Asset & Content' });
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
});
