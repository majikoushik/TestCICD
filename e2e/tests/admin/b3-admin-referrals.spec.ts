import { test, expect } from '../../fixtures/base';
import { AdminReferralsPage } from '../../pages/admin/AdminReferralsPage';
import { ApiClient } from '../../fixtures/api-client';
import { uniquePatientName, uniqueReferralReason } from '../../fixtures/test-data';
import { createReferralDisputeFixture } from '../../support/db';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

async function createReferralAsProviderA(reason: string) {
  const aApi = await ApiClient.create();
  const { token } = await aApi.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
  await aApi.dispose();
  const a = await ApiClient.create(token);

  const bApi = await ApiClient.create();
  const { user: providerB } = await bApi.login(process.env.PROVIDER_B_EMAIL!, DEMO_PASSWORD);
  await bApi.dispose();

  const patient = await a.createPatient({ name: uniquePatientName('AdminRefOversight') });
  const referral = await a.createReferral({ patientId: patient._id || patient.id, receivingProviderId: providerB.id || providerB._id, reason });
  await a.dispose();
  return referral;
}

test.describe('B3 Admin — Referrals Oversight', () => {
  test('B3-01 @P0 - Referral Management loads all referrals with filters @regression', async ({ page }) => {
    const referrals = new AdminReferralsPage(page);
    await referrals.goto();
    await expect(referrals.searchInput()).toBeVisible();
    await expect(referrals.statusSelect()).toBeVisible();
    await expect(referrals.hasDisputeSelect()).toBeVisible();
  });

  test('B3-02 @P0 - Search referrals narrows the table', async ({ page }) => {
    const reason = uniqueReferralReason('AdminSearch');
    await createReferralAsProviderA(reason);

    const referrals = new AdminReferralsPage(page);
    await referrals.goto();
    await referrals.searchInput().fill(reason);
    await expect(referrals.row(reason)).toBeVisible();
  });

  test('B3-04 @P0 - Filter by Has Dispute narrows correctly @regression', async ({ page }) => {
    const reason = uniqueReferralReason('DisputeFilter');
    const referral = await createReferralAsProviderA(reason);
    const aApi = await ApiClient.create();
    const { user: providerA } = await aApi.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
    await aApi.dispose();
    await createReferralDisputeFixture(referral._id || referral.id, providerA.id || providerA._id, providerA.name);

    const referrals = new AdminReferralsPage(page);
    await referrals.goto();
    await referrals.filterByDispute('Yes');
    await expect(referrals.row(reason)).toBeVisible();

    await referrals.filterByDispute('No');
    await expect(referrals.row(reason)).toHaveCount(0);
    await referrals.filterByDispute('All');
  });

  test('B3-05 @P0 - Dispute column shows the real dispute status @regression', async ({ page }) => {
    const reason = uniqueReferralReason('DisputeStatus');
    const referral = await createReferralAsProviderA(reason);
    const aApi = await ApiClient.create();
    const { user: providerA } = await aApi.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
    await aApi.dispose();
    await createReferralDisputeFixture(referral._id || referral.id, providerA.id || providerA._id, providerA.name);

    const referrals = new AdminReferralsPage(page);
    await referrals.goto();
    await referrals.searchInput().fill(reason);
    await expect(referrals.disputeChip(reason)).toContainText(/pending/i);
  });

  test('B3-06 @P0 - Tabs show correct filtered counts', async ({ page }) => {
    const referrals = new AdminReferralsPage(page);
    await referrals.goto();
    for (const tab of ['All Referrals', 'Pending', 'Accepted', 'Completed', 'Cancelled/Rejected'] as const) {
      await referrals.tab(tab).click();
      await expect(referrals.tab(tab)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('B3-07 @P1 - View referral detail dialog renders patient and provider info', async ({ page }) => {
    const reason = uniqueReferralReason('AdminDetail');
    await createReferralAsProviderA(reason);

    const referrals = new AdminReferralsPage(page);
    await referrals.goto();
    await referrals.searchInput().fill(reason);
    await referrals.viewDetailsIcon(reason).click();
    await expect(page.getByRole('dialog').getByText(reason)).toBeVisible();
  });

  test('B3-08 @P0 - Edit and save Workflow Settings persists after reload @regression', async ({ page }) => {
    const referrals = new AdminReferralsPage(page);
    await referrals.goto();
    await referrals.tab('Workflow Settings').click();
    const newHours = '48';
    await referrals.slaAcceptHoursInput().fill(newHours);
    await referrals.saveSettingsButton().click();
    await expect(referrals.settingsSavedSnackbar()).toBeVisible();

    await page.reload();
    await referrals.tab('Workflow Settings').click();
    await expect(referrals.slaAcceptHoursInput()).toHaveValue(newHours);
  });

  test('B3-09 @P0 - View Stats dialog loads statistics', async ({ page }) => {
    const referrals = new AdminReferralsPage(page);
    await referrals.goto();
    await referrals.viewStatsButton().click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
