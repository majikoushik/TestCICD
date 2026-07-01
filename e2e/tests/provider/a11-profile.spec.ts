import { test, expect } from '../../fixtures/base';
import { ProfilePage } from '../../pages/provider/ProfilePage';
import { ApiClient } from '../../fixtures/api-client';
import { uniqueEmail } from '../../fixtures/test-data';
import { createVerifiedProviderWithoutWallet } from '../../support/db';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

test.describe('A11 Profile', () => {
  test('A11-01 @P0 - Profile loads real user data @regression', async ({ page, api }) => {
    const me = await (await api.raw.get('/auth/me')).json();
    const profile = new ProfilePage(page);
    await profile.goto();
    await expect(page.getByText(me.user.email)).toBeVisible();
  });

  test('A11-02 @P0 - Edit and save profile persists after reload', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.editButton().click();
    const newBio = `E2E_ bio update ${Date.now()}`;
    await profile.bioInput().fill(newBio);
    await profile.saveButton().click();
    await expect(page.getByText(/profile (updated|saved) successfully/i)).toBeVisible();

    await page.reload();
    await expect(page.getByText(newBio)).toBeVisible();
  });

  test('A11-03 @P1 - Cancel discards changes', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();
    const originalBio = (await profile.bioInput().inputValue().catch(() => '')) || '';
    await profile.editButton().click();
    await profile.bioInput().fill('This change should never be saved.');
    await profile.cancelButton().click();
    await profile.editButton().click();
    await expect(profile.bioInput()).not.toHaveValue('This change should never be saved.');
  });

  test('A11-04 @P0 - Start blockchain verification succeeds for an unverified user @regression', async ({ page }) => {
    const email = uniqueEmail('a11-04');
    await createVerifiedProviderWithoutWallet(email, DEMO_PASSWORD);

    const login = await ApiClient.create();
    const { token } = await login.login(email, DEMO_PASSWORD);
    await login.dispose();

    await page.goto('/');
    await page.evaluate((t) => localStorage.setItem('auth:token', JSON.stringify(t)), token);
    await page.goto('/app/profile');

    const profile = new ProfilePage(page);
    await profile.startVerification();
    await expect(profile.verifiedBadge()).toBeVisible();
  });

  test('A11-06 @P2 - Re-verifying an already-verified user returns already-verified, no duplicate', async ({ page, api }) => {
    const profile = new ProfilePage(page);
    await profile.goto();
    const isVerified = await profile.verifiedBadge().isVisible().catch(() => false);
    test.skip(!isVerified, 'Provider A is not yet blockchain-verified in this environment.');

    const res = await api.raw.post('/users/blockchain/verify');
    const body = await res.json();
    expect(body.data?.alreadyVerified).toBe(true);
  });
});
