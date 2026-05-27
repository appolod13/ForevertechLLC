import { test, expect } from '@playwright/test';

test.describe('Studio Generate & Import', () => {
  test('generates image and replaces placeholder on import', async ({ page }) => {
    await page.goto('/studio?test=1');

    const postBox = page.getByPlaceholder("What's on your mind? #Web3");
    await expect(postBox).toBeVisible();
    await postBox.fill('My campaign post. (Attached: Generated Image)');

    const promptBox = page.locator('textarea[placeholder="Describe the image you want to generate..."]');
    await expect(promptBox).toBeVisible();
    await promptBox.fill('futuristic city skyline at dusk, neon lights, high detail');

    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, imageUrl: '/public/ai-gen-test.png' }),
      });
    });

    const generateBtn = page.getByRole('button', { name: /Generate Asset/i });
    const start = Date.now();
    await generateBtn.click();

    const generatedImg = page.locator('img[alt=""]');
    await expect(generatedImg).toBeVisible({ timeout: 20000 });
    const genDuration = Date.now() - start;
    expect(genDuration).toBeLessThan(20000);

    let importBtn = page.getByRole('button', { name: 'Import to Multi-Channel Poster' });
    const visiblePrimary = await importBtn.isVisible().catch(() => false);
    if (!visiblePrimary) {
      importBtn = page.getByRole('button', { name: 'Import' });
    }
    await expect(importBtn).toBeEnabled({ timeout: 20000 });
    await importBtn.click();

    await expect(postBox).toHaveValue(/\(Attached: Generated Image\): (http|data:image)/, { timeout: 20000 });
  });
});
