import { test, expect } from '../../fixtures/base';
import { RegisterPage } from '../../pages/provider/AuthPages';
import { uniqueEmail } from '../../fixtures/test-data';

/**
 * A1 — Registration. See QA_TEST_SCENARIOS.md Part A, section A1.
 * Runs unauthenticated, so it does not depend on the `provider-a` storageState
 * project — these specs are still collected under tests/provider for grouping,
 * but each test starts a fresh, logged-out context via `test.use`.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('A1 Registration', () => {
  test('A1-01 @P0 - Register via NPI lookup surfaces a result either way @regression', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();

    await register.roleChip('doctor').click();
    // NPPES lookup is a real third-party call — per suite policy we only
    // assert that the app surfaces *some* deterministic result (found vs.
    // not-found vs. already-registered), never the specific NPPES payload.
    // A syntactically-valid-but-unassigned NPI reliably returns "not found",
    // which is exercised explicitly by A1-03; this scenario instead uses a
    // known seeded NPI to confirm the "already registered" rendering path.
    await register.lookupNpi('1234567890'); // seeded as john.smith@clinictrustai.com — see populate_db.js
    await expect(page.getByText(/already registered/i).first()).toBeVisible();
  });

  test('A1-02 @P1 - NPI lookup with invalid format is rejected client-side', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.roleChip('doctor').click();
    await register.npiInput().fill('12345'); // too short
    await register.lookUpButton().click();
    await expect(page.getByText(/npi must be exactly 10 digits/i)).toBeVisible();
  });

  test('A1-03 @P1 - NPI lookup for a nonexistent NPI', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.roleChip('doctor').click();
    // Valid Luhn-ish format, astronomically unlikely to be a real NPPES record.
    await register.lookupNpi('9999999999');
    await expect(page.getByText(/npi not found in the nppes registry/i)).toBeVisible();
  });

  test('A1-04 @P0 - NPI already registered and verified blocks duplicate registration', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.roleChip('doctor').click();
    // NPI for the seeded, fully-verified john.smith@clinictrustai.com account.
    await register.lookupNpi('1234567890');
    await expect(page.getByText(/already registered and verified/i).first()).toBeVisible();
    await expect(register.signInInsteadButton()).toBeVisible();
  });

  test.fixme(
    'A1-05 @P1 - NPI already registered, pending email verification',
    async () => {},
    'Requires a fixture account already parked mid-registration in the pending_email ' +
      'state with a known, reusable NPI. populate_db.js only seeds fully-verified accounts. ' +
      'Automate by having global-setup register (via API) and deliberately not verify one ' +
      'such fixture account per test run, then look up its NPI here.'
  );

  test('A1-10 @P0 - Registering with an NPI already used by another account is rejected server-side', async ({ page, api }) => {
    // The UI's own NPI-lookup step already prevents reaching this state (that's
    // A1-04) — this test instead verifies the server independently rejects it,
    // in case a client ever posts directly to /auth/register bypassing the lookup.
    const res = await api.raw.post('/auth/register', {
      data: {
        name: 'Duplicate NPI Attempt',
        email: uniqueEmail('a1-10'),
        password: 'Str0ngPass!23',
        role: 'doctor',
        organization: 'E2E_Test Clinic',
        npi: '1234567890', // already registered to john.smith@clinictrustai.com
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body).toHaveProperty('npiStatus');
  });

  test('A1-06 @P1 - Skip NPI lookup for a clinic role', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.roleChip('clinic').click();
    await register.skipNpiLookupButton().click();
    await expect(register.firstNameInput()).toBeVisible();
  });

  test('A1-07 @P0 - Complete Step 1 with a unique email registers successfully @regression', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.roleChip('clinic').click();
    await register.skipNpiLookupButton().click();

    await register.completeAccountSetup({
      firstName: 'E2E',
      lastName: 'Tester',
      email: uniqueEmail('a1-07'),
      organization: 'E2E_Test Clinic',
      password: 'Str0ngPass!23',
    });

    await expect(page.getByText(/check your inbox/i)).toBeVisible();
  });

  test('A1-08 @P0 - Register with a duplicate email is rejected', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.roleChip('clinic').click();
    await register.skipNpiLookupButton().click();

    await register.completeAccountSetup({
      firstName: 'Dup',
      lastName: 'Test',
      email: process.env.PROVIDER_A_EMAIL!, // already registered
      organization: 'E2E_Test Clinic',
      password: 'Str0ngPass!23',
    });

    await expect(page.getByText(/email already registered/i)).toBeVisible();
  });

  test('A1-09 @P0 - Register with a password under 8 characters is rejected @regression', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.roleChip('clinic').click();
    await register.skipNpiLookupButton().click();

    await register.completeAccountSetup({
      firstName: 'Weak',
      lastName: 'Pass',
      email: uniqueEmail('a1-09'),
      organization: 'E2E_Test Clinic',
      password: 'short1',
    });

    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible();
  });

  test('A1-11 @P0 - Step 2 verification screen shows the registered email and a resend button', async ({ page }) => {
    const register = new RegisterPage(page);
    const email = uniqueEmail('a1-11');
    await register.goto();
    await register.roleChip('clinic').click();
    await register.skipNpiLookupButton().click();
    await register.completeAccountSetup({
      firstName: 'Verify',
      lastName: 'Screen',
      email,
      organization: 'E2E_Test Clinic',
      password: 'Str0ngPass!23',
    });

    await expect(page.getByText(email)).toBeVisible();
    await expect(register.resendButton()).toBeVisible();
    await expect(register.goToSignInLink()).toBeVisible();
  });

  test('A1-12 @P1 - Resend verification email is cooldown-gated', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.roleChip('clinic').click();
    await register.skipNpiLookupButton().click();
    await register.completeAccountSetup({
      firstName: 'Cooldown',
      lastName: 'Test',
      email: uniqueEmail('a1-12'),
      organization: 'E2E_Test Clinic',
      password: 'Str0ngPass!23',
    });

    await register.resendButton().click();
    await expect(register.resendButton()).toBeDisabled();
  });

  test.fixme(
    'A1-13 @P0 - Verify email via link @regression',
    async () => {},
    'Requires the real (unhashed) verification token, which the server only ever emails ' +
      'to the user — server/routes/auth.js stores a SHA-256 hash, so it cannot be read back ' +
      'from the database. Automate this by adding a test-only endpoint that returns the raw ' +
      'token in non-production environments (mirroring the existing dev-mode `resetToken` ' +
      'shortcut used for password reset in A2-11), then wire this test to call it.'
  );

  test.fixme(
    'A1-14 @P1 - Verify email with an expired/invalid token',
    async () => {},
    'Same blocker as A1-13 — needs a real token to tamper with.'
  );
});
