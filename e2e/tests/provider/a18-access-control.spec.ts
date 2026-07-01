import { test, expect } from '../../fixtures/base';
import { ApiClient } from '../../fixtures/api-client';
import { uniquePatientName } from '../../fixtures/test-data';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

test.describe('A18 Cross-Cutting: Access Control & Negative Paths', () => {
  test('A18-01 @P0 - Provider cannot access admin routes @regression', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
  });

  test('A18-02 @P0 - Provider cannot view an unrelated patient @regression', async ({ api }) => {
    const bApi = await ApiClient.create();
    const { token } = await bApi.login(process.env.PROVIDER_B_EMAIL!, DEMO_PASSWORD);
    await bApi.dispose();
    const b = await ApiClient.create(token);
    const patient = await b.createPatient({ name: uniquePatientName('Unrelated') });
    await b.dispose();

    const res = await api.raw.get(`/patients/${patient._id || patient.id}`);
    expect(res.status()).toBe(403);
  });

  test('A18-03 @P1 - Direct URL to a nonexistent referral shows a not-found state', async ({ page }) => {
    await page.goto('/app/referrals/000000000000000000000000');
    await expect(page.getByText(/not found/i)).toBeVisible();
  });

  test('A18-03b @P1 - Direct URL to a nonexistent patient shows a not-found state', async ({ page }) => {
    await page.goto('/app/patients/000000000000000000000000');
    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});
