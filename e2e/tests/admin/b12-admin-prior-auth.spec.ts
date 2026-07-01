import { test, expect } from '../../fixtures/base';
import { AdminPriorAuthPage } from '../../pages/admin/AdminPriorAuthPage';
import { ApiClient } from '../../fixtures/api-client';
import { uniquePatientName } from '../../fixtures/test-data';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

async function createPaAsProviderA(patientName: string) {
  const login = await ApiClient.create();
  const { token } = await login.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
  await login.dispose();
  const provider = await ApiClient.create(token);
  const patient = await provider.createPatient({ name: patientName });
  const pa = await provider.createPriorAuth({ patientId: patient._id || patient.id, patientName: patient.name });
  await provider.dispose();
  return pa;
}

test.describe('B12 Admin — Prior Authorization Oversight', () => {
  test('B12-01 @P0 - PA queue loads with stat cards @regression', async ({ page }) => {
    await createPaAsProviderA(uniquePatientName('AdminPaQueue'));
    const pa = new AdminPriorAuthPage(page);
    await pa.goto();
    for (const label of ['Pending', 'Under Review', 'Approved', 'Denied', 'Appealing', 'Expired'] as const) {
      await expect(pa.statCard(label)).toBeVisible();
    }
  });

  test('B12-03 @P0 - Approve a PA with a chosen duration @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('AdminPaApprove');
    const created = await createPaAsProviderA(patientName);

    const pa = new AdminPriorAuthPage(page);
    await pa.goto();
    await pa.approve(patientName, '90');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const res = await api.raw.get(`/prior-auth/${created._id || created.id}`);
    const body = (await res.json()).data;
    expect(body.status).toBe('Approved');
    expect(body.approvalDurationDays).toBe(90);
  });

  test('B12-04 @P0 - Deny a PA with a CARC reason @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('AdminPaDeny');
    const created = await createPaAsProviderA(patientName);

    const pa = new AdminPriorAuthPage(page);
    await pa.goto();
    await pa.deny(patientName, '50');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const res = await api.raw.get(`/prior-auth/${created._id || created.id}`);
    const body = (await res.json()).data;
    expect(body.status).toBe('Denied');
    expect(body.denialReasonCode).toBe('50');
  });

  test('B12-05 @P1 - Bulk approve updates all selected PAs @regression', async ({ page, api }) => {
    const patientA = uniquePatientName('BulkPaA');
    const patientB = uniquePatientName('BulkPaB');
    const paA = await createPaAsProviderA(patientA);
    const paB = await createPaAsProviderA(patientB);

    const admin = await ApiClient.create();
    const { token } = await admin.adminLogin(process.env.ADMIN_EMAIL!, DEMO_PASSWORD);
    await admin.dispose();
    const adminClient = await ApiClient.create(token);
    const res = await adminClient.raw.post('/admin/prior-auth/bulk-review', {
      data: { ids: [paA._id || paA.id, paB._id || paB.id], decision: 'Approved', approvalDurationDays: 60 },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.processed).toBeGreaterThanOrEqual(2);
    await adminClient.dispose();
  });

  test('B12-07 @P1 - Re-run AI analysis on a PA', async ({ page, api }) => {
    const patientName = uniquePatientName('AdminPaReanalyze');
    const created = await createPaAsProviderA(patientName);

    const admin = await ApiClient.create();
    const { token } = await admin.adminLogin(process.env.ADMIN_EMAIL!, DEMO_PASSWORD);
    await admin.dispose();
    const adminClient = await ApiClient.create(token);
    const res = await adminClient.raw.post(`/admin/prior-auth/${created._id || created.id}/analyze`);
    expect(res.ok()).toBeTruthy();
    await adminClient.dispose();
  });

  test('B12-08 @P1 - View PA audit history as admin', async ({ page }) => {
    const patientName = uniquePatientName('AdminPaHistory');
    await createPaAsProviderA(patientName);

    const pa = new AdminPriorAuthPage(page);
    await pa.goto();
    await pa.viewHistoryButton(patientName).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
