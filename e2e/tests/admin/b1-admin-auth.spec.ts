import { test, expect } from '../../fixtures/base';
import { AdminLoginPage } from '../../pages/admin/AdminAuthPage';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

test.describe('B1 Admin Authentication', () => {
  test.describe('logged out', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('B1-01 @P0 - Admin login redirects into the admin panel @regression', async ({ page }) => {
      const login = new AdminLoginPage(page);
      await login.goto();
      await login.login(process.env.ADMIN_EMAIL!, DEMO_PASSWORD);
      await expect(page).toHaveURL(/\/admin\//);
    });

    test('B1-02 @P0 - Admin login with wrong password is rejected', async ({ page, api }) => {
      const res = await api.raw.post('/admin/auth/login', { data: { email: process.env.ADMIN_EMAIL, password: 'WrongPassword123!' } });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/invalid credentials/i);
    });

    test('B1-03 @P0 - Provider credentials are rejected on admin login @regression', async ({ api }) => {
      const res = await api.raw.post('/admin/auth/login', { data: { email: process.env.PROVIDER_A_EMAIL, password: DEMO_PASSWORD } });
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.error).toMatch(/access denied\. admin privileges required/i);
    });
  });

  test('B1-05 @P0 - Admin logout clears the session and blocks admin routes', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.getByRole('button', { name: /logout|sign out/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('B1-06 @P1 - Admin session persists across a refresh', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.reload();
    await expect(page).not.toHaveURL(/\/admin\/login/);
  });
});
