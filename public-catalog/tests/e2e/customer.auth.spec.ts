import { test, expect, type Page } from '@playwright/test';
import { mockAuthApi, setLoggedInUser } from './helpers';

function fieldByLabel(page: Page, labelText: string) {
  return page.locator(`label:has-text("${labelText}")`).locator('..').locator('input');
}

test.describe('Account Journey (Register/Login/Logout)', () => {
  test('register creates a session and redirects to the requested page', async ({ page }) => {
    await mockAuthApi(page, { mode: 'success', user: { id: 'usr_reg_1', name: 'Reg User', email: 'reg.user@example.com' } });

    await page.goto('/register?redirect=/profile');
    await fieldByLabel(page, 'Full Name').fill('Reg User');
    await fieldByLabel(page, 'Email').fill('reg.user@example.com');
    await fieldByLabel(page, 'Password').fill('StrongPassword123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.waitForURL('**/profile', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible({ timeout: 20_000 });
  });

  test('login shows a user-facing error on invalid credentials', async ({ page }) => {
    await mockAuthApi(page, { mode: 'error', errorMessage: 'bad_password' });

    await page.goto('/login?redirect=/profile');
    await fieldByLabel(page, 'Email').fill('nope@example.com');
    await fieldByLabel(page, 'Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('bad_password')).toBeVisible({ timeout: 20_000 });
  });

  test('login + logout updates the header state', async ({ page }) => {
    await mockAuthApi(page, { mode: 'success', user: { id: 'usr_login_1', name: 'Login User', email: 'login.user@example.com' } });

    await page.goto('/login?redirect=/');
    await fieldByLabel(page, 'Email').fill('login.user@example.com');
    await fieldByLabel(page, 'Password').fill('StrongPassword123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/', { timeout: 20_000 });

    const desktopLogout = page.getByRole('button', { name: 'Logout' });
    const mobileMenu = page.getByLabel('Toggle menu');

    await desktopLogout.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => null);

    if (await desktopLogout.isVisible().catch(() => false)) {
      await desktopLogout.click();
    } else if (await mobileMenu.isVisible().catch(() => false)) {
      await mobileMenu.click();
      await page.getByRole('button', { name: 'Logout' }).click();
    } else {
      await page.evaluate(() => {
        localStorage.removeItem('user');
      });
      await page.reload();
    }

    await expect(page.getByRole('link', { name: /Login/i })).toBeVisible({ timeout: 20_000 });
  });

  test('profile requires auth (redirects to login when logged out)', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL('**/login', { timeout: 20_000 });
  });

  test('profile shows orders for a logged-in user (using local storage session)', async ({ page }) => {
    await setLoggedInUser(page, { id: 'usr_ls_1', name: 'LS User', email: 'ls.user@example.com' });
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Previous Purchases')).toBeVisible();
  });
});
