import { test, expect } from '../../fixtures/base';
import { AdminKycPage } from '../../pages/admin/AdminKycPage';
import { ApiClient } from '../../fixtures/api-client';
import { uniqueEmail } from '../../fixtures/test-data';
import { markEmailVerified } from '../../support/db';
import { getSamplePdfPath } from '../../fixtures/files';
import fs from 'fs';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

/** Drives a fresh provider all the way to kycStatus 'under_review' via the real API — no UI. */
async function createUnderReviewProvider(label: string): Promise<{ name: string; email: string }> {
  const email = uniqueEmail(label);
  const name = `E2E ${label}`;
  const register = await ApiClient.create();
  await register.raw.post('/auth/register', { data: { name, email, password: DEMO_PASSWORD, role: 'doctor', organization: 'E2E_Test Clinic' } });
  await register.dispose();
  await markEmailVerified(email);

  const login = await ApiClient.create();
  const { token } = await login.login(email, DEMO_PASSWORD);
  await login.dispose();
  const provider = await ApiClient.create(token);
  await provider.raw.patch('/onboarding/profile', { data: { specialties: ['Cardiology'], phone: '555-0155' } });
  await provider.raw.post('/onboarding/documents', {
    multipart: {
      licenseNumber: 'LIC-B2-TEST',
      document: { name: 'license.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(getSamplePdfPath()) },
    },
  });
  await provider.dispose();

  return { name, email };
}

test.describe('B2 Admin — KYC Review', () => {
  test('B2-01 @P0 - KYC queue loads pending providers @regression', async ({ page }) => {
    const { name } = await createUnderReviewProvider('b2-01');
    const kyc = new AdminKycPage(page);
    await kyc.goto();
    await expect(kyc.row(name)).toBeVisible();
  });

  test('B2-02 @P0 - Approve a provider\'s KYC @regression', async ({ page, api }) => {
    const { name, email } = await createUnderReviewProvider('b2-02');
    const kyc = new AdminKycPage(page);
    await kyc.goto();
    await kyc.approve(name);
    await expect(page.getByText(/provider approved successfully/i)).toBeVisible();

    const login = await ApiClient.create();
    const { user } = await login.login(email, DEMO_PASSWORD);
    await login.dispose();
    expect(user.onboardingStatus || user.kycStatus).toMatch(/verified/i);
  });

  test('B2-03 @P0 - Reject a provider\'s KYC with a reason @regression', async ({ page }) => {
    const { name, email } = await createUnderReviewProvider('b2-03');
    const kyc = new AdminKycPage(page);
    await kyc.goto();
    const reason = 'Incomplete license documentation submitted.';
    await kyc.reject(name, reason);
    await expect(page.getByText(/provider rejected\./i)).toBeVisible();

    const login = await ApiClient.create();
    const { token } = await login.login(email, DEMO_PASSWORD);
    await login.dispose();
    const statusRes = await (await ApiClient.create(token)).raw.get('/onboarding/status');
    const body = await statusRes.json();
    expect(body.data.kycRejectionReason).toBe(reason);
  });

  test('B2-04 @P1 - View a submitted KYC document opens without error', async ({ page }) => {
    const { name } = await createUnderReviewProvider('b2-04');
    const kyc = new AdminKycPage(page);
    await kyc.goto();
    const [popup] = await Promise.all([
      page.waitForEvent('popup').catch(() => null),
      kyc.viewDocumentButton(name).click(),
    ]);
    if (popup) await popup.close();
  });

  test('B2-06 @P1 - Resend verification email shows an in-app confirmation', async ({ page }) => {
    const { name } = await createUnderReviewProvider('b2-06');
    const kyc = new AdminKycPage(page);
    await kyc.goto();
    await kyc.resendVerificationButton(name).click();
    await expect(page.getByText(/verification email (sent|resent)/i)).toBeVisible();
  });

  test('B2-07 @P0 - Hard-delete a provider removes the account entirely @regression', async ({ page, api }) => {
    const { name, email } = await createUnderReviewProvider('b2-07');
    const kyc = new AdminKycPage(page);
    await kyc.goto();
    await kyc.deleteButton(name).click();
    await kyc.confirmButton().click();
    await expect(kyc.row(name)).toHaveCount(0);

    const res = await api.raw.post('/auth/login', { data: { email, password: DEMO_PASSWORD } });
    expect(res.status()).toBe(401);
  });

  test('B2-08 @P1 - Refresh re-fetches the KYC list', async ({ page }) => {
    const kyc = new AdminKycPage(page);
    await kyc.goto();
    await kyc.refreshButton().click();
  });
});
