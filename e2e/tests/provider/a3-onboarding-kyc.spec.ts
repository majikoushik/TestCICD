import { test, expect } from '../../fixtures/base';
import { ApiClient } from '../../fixtures/api-client';
import { OnboardingWallPage, OnboardingProfileSetupPage } from '../../pages/provider/OnboardingPage';
import { LoginPage } from '../../pages/provider/AuthPages';
import { uniqueEmail } from '../../fixtures/test-data';
import { getSamplePdfPath, getSampleJpgPath, getDisallowedFileTypePath, getOversizedFilePath } from '../../fixtures/files';
import { markEmailVerified } from '../../support/db';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

test.use({ storageState: { cookies: [], origins: [] } });

/** Registers a fresh provider and logs the Playwright page in as them — lands on the onboarding wall. */
async function registerAndLogin(page: import('@playwright/test').Page, label: string) {
  const api = await ApiClient.create();
  const email = uniqueEmail(label);
  const res = await api.raw.post('/auth/register', {
    data: { name: `E2E ${label}`, email, password: DEMO_PASSWORD, role: 'clinic', organization: 'E2E_Test Clinic' },
  });
  await res.json();
  await api.dispose();

  const login = new LoginPage(page);
  await login.goto();
  await login.login(email, DEMO_PASSWORD);
  return { email };
}

test.describe('A3 Onboarding / KYC (Provider Side)', () => {
  test('A3-01 @P0 - New provider sees the onboarding wall @regression', async ({ page }) => {
    await registerAndLogin(page, 'a3-01');
    await expect(page).toHaveURL(/\/onboarding/);
    const wall = new OnboardingWallPage(page);
    await expect(wall.headerTitle()).toBeVisible();
    await expect(wall.stepsRemainingText()).toBeVisible();

    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/onboarding/); // cannot reach the app
  });

  test('A3-02 @P0 - Complete Step 2, Profile Setup @regression', async ({ page }) => {
    const { email } = await registerAndLogin(page, 'a3-02');
    await markEmailVerified(email);

    const wall = new OnboardingWallPage(page);
    await wall.goto();
    await wall.getStartedButton().click();
    await expect(page).toHaveURL(/\/onboarding\/profile/);

    const profile = new OnboardingProfileSetupPage(page);
    await profile.selectSpecialty('Cardiology');
    await profile.fillPhone('555-0142');
    await profile.save();

    await expect(page.getByText(/profile saved.*upload your verification documents/i)).toBeVisible();
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 5_000 });
  });

  test('A3-03 @P1 - Profile Setup validation blocks incomplete submissions', async ({ page }) => {
    const { email } = await registerAndLogin(page, 'a3-03');
    await markEmailVerified(email);

    const wall = new OnboardingWallPage(page);
    await wall.goto();
    await wall.getStartedButton().click();

    const profile = new OnboardingProfileSetupPage(page);
    await profile.save();
    await expect(page.getByText(/please select at least one specialty/i)).toBeVisible();

    await profile.selectSpecialty('Cardiology');
    await profile.save();
    await expect(page.getByText(/phone number is required/i)).toBeVisible();
  });

  async function reachDocUploadStep(page: import('@playwright/test').Page, label: string) {
    const { email } = await registerAndLogin(page, label);
    await markEmailVerified(email);
    const wall = new OnboardingWallPage(page);
    await wall.goto();
    await wall.getStartedButton().click();
    const profile = new OnboardingProfileSetupPage(page);
    await profile.selectSpecialty('Cardiology');
    await profile.fillPhone('555-0142');
    await profile.save();
    await page.waitForURL(/\/onboarding$/, { timeout: 5_000 });
    return { email };
  }

  test('A3-04 @P0 - Upload KYC document as a PDF @regression', async ({ page }) => {
    await reachDocUploadStep(page, 'a3-04');
    const wall = new OnboardingWallPage(page);
    await wall.uploadKycDocument('LIC-100001', getSamplePdfPath());
    await expect(page.getByText(/documents submitted.*review within 1-2 business days/i)).toBeVisible();
  });

  test('A3-05 @P0 - Upload KYC document as a JPG', async ({ page }) => {
    await reachDocUploadStep(page, 'a3-05');
    const wall = new OnboardingWallPage(page);
    await wall.uploadKycDocument('LIC-100002', getSampleJpgPath());
    await expect(page.getByText(/documents submitted.*review within 1-2 business days/i)).toBeVisible();
  });

  test('A3-06 @P1 - Disallowed file type is rejected', async ({ page }) => {
    await reachDocUploadStep(page, 'a3-06');
    const wall = new OnboardingWallPage(page);
    await wall.uploadNowButton().click();
    await wall.licenseNumberInput().fill('LIC-100003');
    await wall.documentFileInput().setInputFiles(getDisallowedFileTypePath());
    await wall.submitDocumentsButton().click();
    await expect(page.getByText(/only pdf, jpg, and png files are allowed/i)).toBeVisible();
  });

  test('A3-07 @P1 - Oversized file is rejected', async ({ page }) => {
    await reachDocUploadStep(page, 'a3-07');
    const wall = new OnboardingWallPage(page);
    await wall.uploadNowButton().click();
    await wall.licenseNumberInput().fill('LIC-100004');
    await wall.documentFileInput().setInputFiles(getOversizedFilePath());
    await wall.submitDocumentsButton().click();
    await expect(page.getByText(/file.*(too large|exceeds|size)/i)).toBeVisible();
  });

  test('A3-08 @P1 - Submit without a license number is rejected', async ({ page }) => {
    await reachDocUploadStep(page, 'a3-08');
    const wall = new OnboardingWallPage(page);
    await wall.uploadNowButton().click();
    await wall.documentFileInput().setInputFiles(getSamplePdfPath());
    await wall.submitDocumentsButton().click();
    await expect(page.getByText(/license number is required/i)).toBeVisible();
  });

  test('A3-09 @P0 - Status reflects submitted KYC on reload', async ({ page }) => {
    await reachDocUploadStep(page, 'a3-09');
    const wall = new OnboardingWallPage(page);
    await wall.uploadKycDocument('LIC-100005', getSamplePdfPath());
    await page.waitForTimeout(500);

    await wall.goto();
    await expect(wall.statusBadge(/under review.*1-2 business days/i)).toBeVisible();

    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/onboarding/); // still blocked pending admin approval
  });

  test('A3-10 @P0 - Verified user is auto-redirected into the app @regression', async ({ page }) => {
    const { email } = await reachDocUploadStep(page, 'a3-10');
    const wall = new OnboardingWallPage(page);
    await wall.uploadKycDocument('LIC-100006', getSamplePdfPath());
    await page.waitForTimeout(500);

    const adminApi = await ApiClient.create();
    const { token } = await adminApi.adminLogin(process.env.ADMIN_EMAIL!, DEMO_PASSWORD);
    const admin = await ApiClient.create(token);
    const usersRes = await admin.raw.get('/admin/kyc', { params: { status: 'under_review' } });
    const pending = (await usersRes.json()).data || [];
    const target = pending.find((p: any) => p.user?.email === email);
    expect(target, 'freshly-submitted provider should appear in the under_review KYC queue').toBeTruthy();
    const approveRes = await admin.raw.patch(`/admin/kyc/${target._id}`, { data: { status: 'verified' } });
    expect(approveRes.ok()).toBeTruthy();
    await admin.dispose();
    await adminApi.dispose();

    await wall.goto();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  test('A3-11 @P1 - Resend verification email from the onboarding wall is cooldown-gated', async ({ page }) => {
    await registerAndLogin(page, 'a3-11');
    const wall = new OnboardingWallPage(page);
    await wall.resendEmailButton().click();
    await expect(wall.resendEmailButton()).toBeDisabled();
  });
});
