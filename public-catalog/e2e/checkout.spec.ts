import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cart');
    const clearBtn = page.locator('[data-testid="clear-cart"]');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    }
  });

  test('Successful checkout clears cart', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="buy-fc"]').first().click();
    await page.goto('/cart');
    await expect(page.locator('[data-testid="checkout-link"]')).toBeVisible();

    await page.locator('[data-testid="checkout-link"]').click();
    await page.waitForURL('**/checkout');

    await page.locator('[data-testid="input-name"]').fill('Test User');
    await page.locator('[data-testid="input-email"]').fill('test@example.com');
    await page.locator('[data-testid="input-phone"]').fill('+15555555555');
    await page.locator('[data-testid="input-address"]').fill('123 Test St');
    await page.locator('[data-testid="input-city"]').fill('Testville');
    await page.locator('[data-testid="input-zip"]').fill('94016');
    await page.locator('[data-testid="input-card"]').fill('4111 1111 1111 1111');
    await page.locator('[data-testid="input-expiry"]').fill('12/30');
    await page.locator('[data-testid="input-cvv"]').fill('123');

    await page.locator('[data-testid="submit-payment"]').click();
    await expect(page.getByText('Order Confirmed!')).toBeVisible();

    await page.goto('/cart');
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('Empty cart checkout shows message', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText('Cart is empty')).toBeVisible();
  });

  test('Payment failure keeps cart items', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="buy-fc"]').first().click();
    await page.goto('/cart');
    await page.locator('[data-testid="checkout-link"]').click();
    await page.waitForURL('**/checkout');

    await page.locator('[data-testid="input-name"]').fill('Fail User');
    await page.locator('[data-testid="input-email"]').fill('fail@example.com');
    await page.locator('[data-testid="input-phone"]').fill('+15555550123');
    await page.locator('[data-testid="input-address"]').fill('1 Broken Rd');
    await page.locator('[data-testid="input-city"]').fill('Nowhere');
    await page.locator('[data-testid="input-zip"]').fill('00000');
    await page.locator('[data-testid="input-card"]').fill('4111 1111 1111 1111');
    await page.locator('[data-testid="input-expiry"]').fill('01/20');
    await page.locator('[data-testid="input-cvv"]').fill('12');

    await page.locator('[data-testid="submit-payment"]').click();

    await expect(page.getByText('Order Confirmed!')).toHaveCount(0);
    await page.goto('/cart');
    await expect(page.getByText('Your cart is empty')).toHaveCount(0);
  });
});
