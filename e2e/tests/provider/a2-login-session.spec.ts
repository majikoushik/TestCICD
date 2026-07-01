import { test, expect } from '../../fixtures/base';
import { LoginPage, ForgotPasswordPage } from '../../pages/provider/AuthPages';
import { SettingsPage } from '../../pages/provider/SettingsPage';
import { DashboardPage } from '../../pages/provider/DashboardPage';
import { ApiClient } from '../../fixtures/api-client';
import { uniqueEmail } from '../../fixtures/test-data';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

test.use({ storageState: { cookies: [], origins: [] } });

/** Registers a fresh, disposable account for tests that must NOT touch the shared demo accounts. */
async function registerDisposableAccount(api: ApiClient, label: string, password = DEMO_PASSWORD) {
  const email = uniqueEmail(label);
  const res = await api.raw.post('/auth/register', {
    data: { name: `E2E ${label}`, email, password, role: 'clinic', organization: 'E2E_Test Clinic' },
  });
  const body = await res.json();
  return { email, password, userId: body.user?.id };
}

test.describe('A2 Login, Logout, Session', () => {
  test('A2-01 @P0 - Successful login redirects into the app', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
    await expect(page).toHaveURL(/\/app\/dashboard|\/onboarding/);
  });

  test('A2-02 @P0 - Login with wrong password shows a generic error', async ({ page }) => {
    // Uses a disposable account, not Provider A — a wrong-password attempt
    // still counts toward lockout (A2-04), and we must never risk locking
    // the shared demo account other specs depend on.
    const api = await ApiClient.create();
    const { email } = await registerDisposableAccount(api, 'a2-02');
    await api.dispose();

    const login = new LoginPage(page);
    await login.goto();
    await login.login(email, 'WrongPassword123!');
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('A2-03 @P1 - Login with a nonexistent email shows the same generic error as A2-02', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('definitely-not-a-real-user@example.com', 'WrongPassword123!');
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('A2-04 @P1 - Repeated failed logins lock the account @regression', async ({ page }) => {
    const api = await ApiClient.create();
    const { email, password } = await registerDisposableAccount(api, 'a2-04');
    await api.dispose();

    const login = new LoginPage(page);
    for (let i = 0; i < 5; i++) {
      await login.goto();
      await login.login(email, 'WrongPassword123!');
      await page.waitForTimeout(300);
    }
    await login.goto();
    await login.login(email, password); // even the CORRECT password should now be blocked
    await expect(page.getByText(/account locked due to too many failed attempts/i)).toBeVisible();
  });

  test.fixme(
    'A2-05 @P1 - Login to a suspended account',
    async () => {},
    'Requires an account with accountStatus="suspended" — no admin UI action to suspend ' +
      '(as opposed to deactivate, which sets isActive=false and is covered by A2-07/B11-04) ' +
      'was found in this codebase. Automate via a direct DB update once a suspend workflow exists.'
  );

  test.fixme(
    'A2-06 @P1 - Login to a rejected account',
    async () => {},
    'Requires a fixture account whose KYC was rejected (see B2-03) — chain this test after ' +
      'that scenario using a disposable registered account, once B2-03 is automated end-to-end ' +
      'with a real KYC document upload.'
  );

  test('A2-07 @P0 - Login to a deactivated account is blocked @regression', async ({ page }) => {
    const api = await ApiClient.create();
    const { email, password, userId } = await registerDisposableAccount(api, 'a2-07');

    const adminApi = await ApiClient.create((await api.adminLogin(process.env.ADMIN_EMAIL!, DEMO_PASSWORD)).token);
    // Deactivate via the same admin endpoint the AdminUsers UI calls (see B11-04).
    const deactivateRes = await adminApi.raw.put(`/admin/users/${userId}`, { data: { isActive: false } });
    if (!deactivateRes.ok()) throw new Error(`Failed to deactivate fixture user: ${deactivateRes.status()} ${await deactivateRes.text()}`);
    await api.dispose();
    await adminApi.dispose();

    const login = new LoginPage(page);
    await login.goto();
    await login.login(email, password);
    await expect(page.getByText(/your account is inactive/i)).toBeVisible();
  });

  test('A2-08 @P0 - Logout clears the session', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
    await expect(page).toHaveURL(/\/app\//);

    await page.getByRole('button', { name: /logout|sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('A2-09 @P0 - Session persists across a page refresh', async ({ page }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);
    await login.goto();
    await login.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
    await page.goto(dashboard.path);
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('A2-10 @P1 - Forgot password always returns a generic confirmation', async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();
    await forgot.submit(process.env.PROVIDER_A_EMAIL!);
    await forgot.expectGenericConfirmation();

    await forgot.goto();
    await forgot.submit('nonexistent@example.com');
    await forgot.expectGenericConfirmation();
  });

  test('A2-11 @P1 - Reset password with a valid token', async ({ page }) => {
    const api = await ApiClient.create();
    const { email, password } = await registerDisposableAccount(api, 'a2-11');

    // server/routes/auth.js returns `resetToken` in the response body when
    // NODE_ENV==='development' — the one documented test hook for this flow.
    const res = await api.raw.post('/auth/request-password-reset', { data: { email } });
    const body = await res.json();
    test.skip(!body.resetToken, 'Server is not running with NODE_ENV=development — resetToken shortcut unavailable.');

    const newPassword = 'NewStr0ngPass!23';
    const resetRes = await api.raw.post('/auth/reset-password', { data: { token: body.resetToken, password: newPassword } });
    expect(resetRes.ok()).toBeTruthy();
    await api.dispose();

    const login = new LoginPage(page);
    await login.goto();
    await login.login(email, password);
    await expect(page.getByText(/invalid credentials/i)).toBeVisible(); // old password now rejected
    await login.goto();
    await login.login(email, newPassword);
    await expect(page).toHaveURL(/\/app\/|\/onboarding/);
  });

  test('A2-12 @P1 - Reset password with an invalid token is rejected', async ({ api }) => {
    const res = await api.raw.post('/auth/reset-password', { data: { token: 'not-a-real-token', password: 'Whatever123!' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid or expired token/i);
  });

  test('A2-13 @P1 - Change password from Settings with correct current password', async ({ page }) => {
    const api = await ApiClient.create();
    const { email, password } = await registerDisposableAccount(api, 'a2-13');
    await api.dispose();

    const login = new LoginPage(page);
    await login.goto();
    await login.login(email, password);

    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.tab('Security').click();
    const newPassword = 'AnotherStr0ngPass!1';
    await settings.changePassword(password, newPassword);
    await expect(page.getByText(/password changed successfully/i)).toBeVisible();

    await page.getByRole('button', { name: /logout|sign out/i }).click();
    await login.goto();
    await login.login(email, newPassword);
    await expect(page).toHaveURL(/\/app\/|\/onboarding/);
  });

  test('A2-14 @P1 - Change password with the wrong current password is rejected', async ({ page }) => {
    const settings = new SettingsPage(page); // runs as provider-a (already authenticated project)
    await settings.goto();
    await settings.tab('Security').click();
    await settings.changePassword('DefinitelyWrongCurrentPassword!', 'NewPassword123!');
    await expect(page.getByText(/current password is incorrect/i)).toBeVisible();
  });

  test('A2-15 @P1 - Change password with a weak new password is blocked client-side', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.tab('Security').click();
    await settings.changePassword(DEMO_PASSWORD, 'weak');
    await expect(page.getByText(/password is too weak/i)).toBeVisible();
  });
});
