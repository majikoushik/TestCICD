import { test, expect } from '../../fixtures/base';

test.describe('B1 Admin Authentication — Superadmin', () => {
  test('B1-04 @P0 - Superadmin gets full access to the admin panel @regression', async ({ page }) => {
    // Regression test for a fixed client-side bug: AdminRoute previously
    // checked `role !== 'admin'` (exact match), redirecting superadmins back
    // to /admin/login even though the server (adminAuth.js) always allowed
    // them. See client/src/App.js AdminRoute — now checks
    // !['admin','superadmin'].includes(role).
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page).not.toHaveURL(/\/admin\/login/);
  });
});
