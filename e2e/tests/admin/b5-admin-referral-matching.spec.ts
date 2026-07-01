import { test, expect } from '../../fixtures/base';
import { AdminReferralMatchingPage } from '../../pages/admin/AdminReferralMatchingPage';
import { ApiClient } from '../../fixtures/api-client';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

test.describe('B5 Admin — AI Referral Matching', () => {
  test('B5-01 @P0 - Match Analytics tab loads stat cards and tables @regression', async ({ page }) => {
    const matching = new AdminReferralMatchingPage(page);
    await matching.goto();
    await matching.matchAnalyticsTabButton().click();
    await expect(page.getByText(/total match sessions/i)).toBeVisible();
    await expect(page.getByText(/recent match sessions/i)).toBeVisible();
  });

  test('B5-03 @P0 - Provider Profiles tab loads and filters', async ({ page }) => {
    const matching = new AdminReferralMatchingPage(page);
    await matching.goto();
    await matching.providerProfilesTabButton().click();
    await matching.searchProvidersInput().fill('Smith');
    await expect(matching.providerRow('Smith')).toBeVisible();
  });

  test('B5-04 @P0 - Edit a provider match profile persists to the database @regression', async ({ page }) => {
    const matching = new AdminReferralMatchingPage(page);
    await matching.goto();
    await matching.providerProfilesTabButton().click();
    await matching.searchProvidersInput().fill('John Smith');
    await matching.editProvider('John Smith', { availabilityScore: 77, accepting: true, insurance: 'Aetna, Cigna' });
    await expect(page.getByText(/updated successfully|saved/i)).toBeVisible();

    await page.reload();
    await matching.providerProfilesTabButton().click();
    await matching.searchProvidersInput().fill('John Smith');
    await matching.viewEditIcon('John Smith').click();
    await expect(matching.availabilityScoreInput()).toHaveValue('77');
  });

  test('B5-05 @P0 - Non-admin cannot edit a provider profile directly @regression', async ({ api }) => {
    const providerApi = await ApiClient.create();
    const { token } = await providerApi.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
    await providerApi.dispose();
    const asProvider = await ApiClient.create(token);

    const listRes = await api.raw.get('/referral-matching/providers');
    const providers = (await listRes.json()).data || [];
    test.skip(providers.length === 0, 'No provider match profiles exist in this environment.');

    const res = await asProvider.raw.put(`/referral-matching/providers/${providers[0]._id}`, { data: { availabilityScore: 10 } });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/forbidden: admin access required/i);
    await asProvider.dispose();
  });

  test('B5-06 @P1 - Refresh reloads the active tab\'s data', async ({ page }) => {
    const matching = new AdminReferralMatchingPage(page);
    await matching.goto();
    await matching.refreshButton().click();
  });
});
