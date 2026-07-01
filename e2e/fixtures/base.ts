import { test as base, expect } from '@playwright/test';
import { ApiClient } from './api-client';

/**
 * Extends Playwright's `test` with an `api` fixture: a real ApiClient
 * authenticated as whichever identity the current project's storageState
 * belongs to (provider-a / admin / superadmin). Specs use this for fast,
 * reliable test-data setup instead of driving the UI to create every
 * precondition — see playwright.config.ts header comment for the full
 * "why real backend, no mocks" rationale.
 */
export const test = base.extend<{ api: ApiClient }>({
  api: async ({ page }, use) => {
    // storageState already logged this browser context in — read the token
    // back out of localStorage (key format: auth:token, JSON-stringified —
    // see client/src/utils/storageUtils.js createNamespacedStorage) rather
    // than logging in again.
    await page.goto('/');
    const rawToken = await page.evaluate(() => window.localStorage.getItem('auth:token'));
    const token = rawToken ? JSON.parse(rawToken) : undefined;

    const api = await ApiClient.create(token);
    await use(api);
    await api.dispose();
  },
});

export { expect };
