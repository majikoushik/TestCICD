import { test, expect } from '../../fixtures/base';
import { AdminAmbientSessionsPage } from '../../pages/admin/AdminAmbientSessionsPage';
import { ApiClient } from '../../fixtures/api-client';
import { uniquePatientName, uniqueChiefComplaint } from '../../fixtures/test-data';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

async function createAmbientSessionAsProviderA(patientName: string, chiefComplaint: string) {
  const login = await ApiClient.create();
  const { token } = await login.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
  await login.dispose();
  const provider = await ApiClient.create(token);
  const res = await provider.raw.post('/ambient-sessions', {
    data: { patientId: `E2E_${Date.now()}`, patientName, chiefComplaint, audioTranscript: 'E2E_ fixture transcript for admin ambient sessions.' },
  });
  await provider.dispose();
  return (await res.json()).data;
}

test.describe('B6 Admin — Ambient AI Sessions', () => {
  test('B6-01 @P0 - Sessions list loads with stat cards @regression', async ({ page }) => {
    await createAmbientSessionAsProviderA(uniquePatientName('AdminAmbientStats'), uniqueChiefComplaint());
    const sessions = new AdminAmbientSessionsPage(page);
    await sessions.goto();
    for (const label of ['Total Sessions', 'Approved', 'Pending Review', 'Submitted'] as const) {
      await expect(sessions.statCard(label)).toBeVisible();
    }
  });

  test('B6-02 @P0 - Search sessions by patient name narrows the table', async ({ page }) => {
    const patientName = uniquePatientName('AdminAmbientSearch');
    await createAmbientSessionAsProviderA(patientName, uniqueChiefComplaint());
    const sessions = new AdminAmbientSessionsPage(page);
    await sessions.goto();
    await sessions.searchInput().fill(patientName);
    await expect(sessions.row(patientName)).toBeVisible();
  });

  test('B6-03 @P0 - Filter by status and urgency narrows the table', async ({ page }) => {
    const sessions = new AdminAmbientSessionsPage(page);
    await sessions.goto();
    await sessions.statusSelect().click();
    await page.getByRole('option', { name: /reviewing/i }).click();
    await sessions.urgencySelect().click();
    await page.getByRole('option', { name: /routine/i }).click();
  });

  test('B6-04 @P1 - Viewing a session is read-only', async ({ page }) => {
    const patientName = uniquePatientName('AdminAmbientView');
    await createAmbientSessionAsProviderA(patientName, uniqueChiefComplaint());
    const sessions = new AdminAmbientSessionsPage(page);
    await sessions.goto();
    await sessions.searchInput().fill(patientName);
    await sessions.viewIcon(patientName).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: /approve|reject|edit|delete/i })).toHaveCount(0);
  });
});
