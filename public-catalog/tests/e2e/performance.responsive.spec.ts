import { test, expect } from '@playwright/test';
import { expectPageLoadUnder } from './helpers';

test.describe('Performance + Responsive UI', () => {
  test('key pages load within a reasonable time budget', async ({ page }) => {
    const project = test.info().project.name;
    const isMobileSafari = project === 'Mobile Safari';
    const baseBudget = isMobileSafari ? 45_000 : 20_000;
    const studioBudget = isMobileSafari ? 60_000 : 30_000;
    await expectPageLoadUnder(page, '/', baseBudget);
    await expectPageLoadUnder(page, '/cart', baseBudget);
    await expectPageLoadUnder(page, '/studio?test=1', studioBudget);
  });

  test('navigation works on both desktop and mobile layouts', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const toggleMenu = page.getByLabel('Toggle menu');
    const isMobile = await toggleMenu.isVisible().catch(() => false);

    if (isMobile) {
      await toggleMenu.click();
      await page.getByRole('link', { name: 'About' }).click();
    } else {
      await page.getByRole('link', { name: 'About' }).click();
    }

    await page.waitForURL('**/about', { timeout: 20_000 });
    await expect(page.getByText('About ForeverTech Catalog')).toBeVisible({ timeout: 20_000 });

    const hasHorizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 2;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
