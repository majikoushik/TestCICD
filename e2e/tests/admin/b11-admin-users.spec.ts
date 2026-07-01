import { test, expect } from '../../fixtures/base';
import { AdminUsersPage } from '../../pages/admin/AdminUsersPage';
import { ApiClient } from '../../fixtures/api-client';
import { uniqueEmail } from '../../fixtures/test-data';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

async function registerDisposableUser(label: string) {
  const api = await ApiClient.create();
  const email = uniqueEmail(label);
  const res = await api.raw.post('/auth/register', {
    data: { name: `E2E ${label}`, email, password: DEMO_PASSWORD, role: 'clinic', organization: 'E2E_Test Clinic' },
  });
  const body = await res.json();
  await api.dispose();
  return { email, userId: body.user?.id };
}

test.describe('B11 Admin — User Management', () => {
  test('B11-01 @P0 - Users list loads with search and filter', async ({ page }) => {
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.searchInput().fill('Smith');
    await expect(users.row('john.smith@clinictrustai.com')).toBeVisible();
  });

  test('B11-02 @P0 - Add a new user @regression', async ({ page }) => {
    const email = uniqueEmail('b11-02');
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.addNewUserButton().click();
    await users.nameInput().fill('E2E New User');
    await users.emailInput().fill(email);
    await users.roleSelect().click();
    await page.getByRole('option', { name: /doctor|clinic|provider/i }).first().click();
    await users.saveButton().click();
    await expect(users.tempPasswordDialog().or(page.getByText(/user created/i))).toBeVisible();
  });

  test('B11-03 @P1 - Edit an existing user persists after reload @regression', async ({ page }) => {
    const { email } = await registerDisposableUser('b11-03');
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.searchInput().fill(email);
    await users.setActive(email, false);
    await expect(page.getByText(/user updated|saved successfully/i)).toBeVisible();

    await page.reload();
    await users.searchInput().fill(email);
    await users.editIcon(email).click();
    expect(await users.activeSwitch().isChecked()).toBe(false);
  });

  test('B11-04 @P0 - Deactivating a user blocks login @regression', async ({ page, api }) => {
    const { email, userId } = await registerDisposableUser('b11-04');
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.searchInput().fill(email);
    await users.setActive(email, false);

    const res = await api.raw.post('/auth/login', { data: { email, password: DEMO_PASSWORD } });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/your account is inactive/i);
  });

  test('B11-05 @P1 - Reactivating a user restores login @regression', async ({ page, api }) => {
    const { email } = await registerDisposableUser('b11-05');
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.searchInput().fill(email);
    await users.setActive(email, false);
    await users.searchInput().fill(email);
    await users.setActive(email, true);

    const res = await api.raw.post('/auth/login', { data: { email, password: DEMO_PASSWORD } });
    expect(res.ok()).toBeTruthy();
  });

  test('B11-06 @P1 - Reset a user\'s password shows a temporary password once @regression', async ({ page }) => {
    const { email } = await registerDisposableUser('b11-06');
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.searchInput().fill(email);
    await users.resetPasswordIcon(email).click();
    await users.confirmButton().click();
    await expect(users.tempPasswordDialog()).toBeVisible();
  });

  test('B11-07 @P1 - Unlock a locked account allows login before natural expiry @regression', async ({ page, api }) => {
    const { email, userId } = await registerDisposableUser('b11-07');
    for (let i = 0; i < 5; i++) {
      await api.raw.post('/auth/login', { data: { email, password: 'WrongPassword123!' } });
    }
    const locked = await api.raw.post('/auth/login', { data: { email, password: DEMO_PASSWORD } });
    expect(locked.status()).toBe(429);

    const users = new AdminUsersPage(page);
    await users.goto();
    await users.searchInput().fill(email);
    await users.unlockIcon(email).click();
    await users.confirmButton().click();

    const res = await api.raw.post('/auth/login', { data: { email, password: DEMO_PASSWORD } });
    expect(res.ok()).toBeTruthy();
  });

  test('B11-08 @P1 - Cannot delete an admin/superadmin user from the UI @regression', async ({ page }) => {
    const users = new AdminUsersPage(page);
    await users.goto();
    await users.searchInput().fill('admin@clinictrustai.com');
    await expect(users.deleteIcon('admin@clinictrustai.com')).toBeDisabled();
  });
});
