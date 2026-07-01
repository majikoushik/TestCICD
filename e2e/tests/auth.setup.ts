import { test as setup } from '@playwright/test';
import { ApiClient } from '../fixtures/api-client';

/**
 * Playwright "setup project" (see playwright.config.ts `projects: [{ name: 'setup' }]`
 * and every other project's `dependencies: ['setup']`). Logs in once per
 * identity via the real API (fast, no UI flakiness), seeds the resulting
 * token into localStorage in the exact shape the app expects
 * (`auth:token` / `auth:user`, JSON-stringified — see
 * client/src/utils/storageUtils.js), then saves storageState so every
 * dependent test starts already authenticated.
 */

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

async function authenticateAndSave(
  page: import('@playwright/test').Page,
  login: () => Promise<{ token: string; user: Record<string, any> }>,
  storagePath: string
) {
  const { token, user } = await login();

  await page.goto('/');
  await page.evaluate(
    ([t, u]) => {
      window.localStorage.setItem('auth:token', JSON.stringify(t));
      window.localStorage.setItem('auth:user', JSON.stringify(u));
    },
    [token, user]
  );

  await page.context().storageState({ path: storagePath });
}

setup('authenticate as provider A', async ({ page }) => {
  const api = await ApiClient.create();
  await authenticateAndSave(
    page,
    () => api.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD),
    '.auth/provider-a.json'
  );
});

setup('authenticate as provider B', async ({ page }) => {
  const api = await ApiClient.create();
  await authenticateAndSave(
    page,
    () => api.login(process.env.PROVIDER_B_EMAIL!, DEMO_PASSWORD),
    '.auth/provider-b.json'
  );
});

setup('authenticate as admin', async ({ page }) => {
  const api = await ApiClient.create();
  await authenticateAndSave(
    page,
    () => api.adminLogin(process.env.ADMIN_EMAIL!, DEMO_PASSWORD),
    '.auth/admin.json'
  );
});

setup('authenticate as superadmin', async ({ page }) => {
  const api = await ApiClient.create();
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'e2e.superadmin@clinictrustai.com';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || DEMO_PASSWORD;
  await authenticateAndSave(
    page,
    () => api.adminLogin(superadminEmail, superadminPassword),
    '.auth/superadmin.json'
  );
});
