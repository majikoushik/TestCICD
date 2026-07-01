import { test, expect } from '../../fixtures/base';
import { ReferralsPage, CreateReferralPage, ReferralDetailPage } from '../../pages/provider/ReferralsPages';
import { uniquePatientName, uniqueReferralReason } from '../../fixtures/test-data';
import { ApiClient } from '../../fixtures/api-client';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

async function getProviderBId(): Promise<string> {
  const api = await ApiClient.create();
  const { user } = await api.login(process.env.PROVIDER_B_EMAIL!, DEMO_PASSWORD);
  await api.dispose();
  return user.id || user._id;
}

test.describe('A6 Referrals', () => {
  test('A6-01 @P0 - Referrals list loads with status tabs @regression', async ({ page }) => {
    const referrals = new ReferralsPage(page);
    await referrals.goto();
    for (const tab of ['All', 'Pending', 'Accepted', 'Completed', 'Rejected', 'Cancelled'] as const) {
      await expect(referrals.tab(tab)).toBeVisible();
    }
  });

  test('A6-02 @P0 - Create referral via manual patient search', async ({ page, api }) => {
    const patientName = uniquePatientName('Referral');
    await api.createPatient({ name: patientName });

    const referrals = new ReferralsPage(page);
    await referrals.goto();
    await referrals.createReferralButton().click();

    const create = new CreateReferralPage(page);
    await create.selectPatientByName(patientName);
    await expect(create.patientInfoPanel()).toBeVisible();
    await create.nextButton().click();

    await create.receivingProviderInput().fill('Michael Chen');
    await page.getByRole('option', { name: /michael chen/i }).first().click();
    await create.nextButton().click();

    const reason = uniqueReferralReason();
    await create.fillReferralDetails(reason, 'Routine');
    await create.createReferralSubmitButton().click();

    await expect(page.getByText(/referral (created|submitted) successfully/i)).toBeVisible();
  });

  test('A6-05 @P0 - Completed referral creation appears under Pending and All @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('ReferralPending');
    const patient = await api.createPatient({ name: patientName });
    const providerBId = await getProviderBId();
    const reason = uniqueReferralReason();
    await api.createReferral({ patientId: patient._id || patient.id, receivingProviderId: providerBId, reason });

    const referrals = new ReferralsPage(page);
    await referrals.goto();
    await referrals.tab('Pending').click();
    await expect(referrals.row(reason)).toBeVisible();
    await referrals.tab('All').click();
    await expect(referrals.row(reason)).toBeVisible();
  });

  test('A6-06 @P1 - Create referral validation blocks incomplete steps', async ({ page }) => {
    const referrals = new ReferralsPage(page);
    await referrals.goto();
    await referrals.createReferralButton().click();
    const create = new CreateReferralPage(page);
    await create.nextButton().click(); // no patient selected
    await expect(page.getByText(/select a patient|patient is required/i)).toBeVisible();
  });

  test.describe('as Provider B (receiving provider)', () => {
    test.use({ storageState: '.auth/provider-b.json' });

    test('A6-07 @P0 - Accept a pending referral @regression', async ({ page, api }) => {
      const patientApi = await ApiClient.create();
      const { token } = await patientApi.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
      const providerAApi = await ApiClient.create(token);
      const patient = await providerAApi.createPatient({ name: uniquePatientName('Accept') });
      const providerBId = await getProviderBId();
      const reason = uniqueReferralReason('Accept');
      await providerAApi.createReferral({ patientId: patient._id || patient.id, receivingProviderId: providerBId, reason });
      await patientApi.dispose();
      await providerAApi.dispose();

      const referrals = new ReferralsPage(page);
      await referrals.goto();
      await referrals.tab('Pending').click();
      await referrals.openRowActions(reason);
      await referrals.acceptReferralMenuItem().click();
      await expect(page.getByText(/referral accepted/i)).toBeVisible();

      await referrals.tab('Accepted').click();
      await expect(referrals.row(reason)).toBeVisible();
    });
  });

  test('A6-10 @P1 - Row menu respects valid transitions for a completed referral', async ({ page, api }) => {
    const patient = await api.createPatient({ name: uniquePatientName('Terminal') });
    const providerBId = await getProviderBId();
    const reason = uniqueReferralReason('Terminal');
    const referral = await api.createReferral({ patientId: patient._id || patient.id, receivingProviderId: providerBId, reason });
    await api.setReferralStatus(referral._id || referral.id, 'accepted');
    await api.setReferralStatus(referral._id || referral.id, 'completed');

    const referrals = new ReferralsPage(page);
    await referrals.goto();
    await referrals.tab('Completed').click();
    await referrals.openRowActions(reason);
    await expect(referrals.viewDetailsMenuItem()).toBeVisible();
    await expect(referrals.acceptReferralMenuItem()).toHaveCount(0);
    await expect(referrals.markAsCompletedMenuItem()).toHaveCount(0);
  });

  test('A6-13 @P1 - Invalid transition is rejected server-side @regression', async ({ api }) => {
    const patient = await api.createPatient({ name: uniquePatientName('InvalidTransition') });
    const providerBId = await getProviderBId();
    const referral = await api.createReferral({ patientId: patient._id || patient.id, receivingProviderId: providerBId, reason: uniqueReferralReason() });
    await api.setReferralStatus(referral._id || referral.id, 'accepted');
    await api.setReferralStatus(referral._id || referral.id, 'completed');

    const res = await api.raw.put(`/referrals/${referral._id || referral.id}/status`, { data: { status: 'accepted' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cannot transition from completed to accepted/i);
  });

  test('A6-15 @P0 - Referral detail tabs render without error', async ({ page, api }) => {
    const patient = await api.createPatient({ name: uniquePatientName('DetailTabs') });
    const providerBId = await getProviderBId();
    const referral = await api.createReferral({ patientId: patient._id || patient.id, receivingProviderId: providerBId, reason: uniqueReferralReason() });

    const detail = new ReferralDetailPage(page);
    await detail.gotoReferral(referral._id || referral.id);
    for (const tab of ['Patient Info', 'Billing', 'Attached Records', 'Notes'] as const) {
      await detail.tab(tab).click();
      await expect(detail.tab(tab)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('A6-16 @P1 - Schedule Appointment from a referral links back to it @regression', async ({ page, api }) => {
    const patient = await api.createPatient({ name: uniquePatientName('ReferralToAppt') });
    const providerBId = await getProviderBId();
    const referral = await api.createReferral({ patientId: patient._id || patient.id, receivingProviderId: providerBId, reason: uniqueReferralReason() });

    const detail = new ReferralDetailPage(page);
    await detail.gotoReferral(referral._id || referral.id);
    await detail.scheduleAppointmentButton().click();
    await expect(page).toHaveURL(/\/app\/appointments\/book/);
  });
});
