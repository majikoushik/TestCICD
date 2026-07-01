import { test, expect } from '../../fixtures/base';
import { PriorAuthPage } from '../../pages/provider/PriorAuthPages';
import { uniquePatientName, VALID_CLINICAL_NOTES, SHORT_CLINICAL_NOTES } from '../../fixtures/test-data';
import { ApiClient } from '../../fixtures/api-client';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

/** Admin-only decision endpoint — server/routes/adminPriorAuth.js PUT /:id/review, mounted at /api/admin/prior-auth. */
async function adminDenyPriorAuth(paId: string): Promise<void> {
  const admin = await ApiClient.create();
  const { token } = await admin.adminLogin(process.env.ADMIN_EMAIL!, DEMO_PASSWORD);
  await admin.dispose();
  const adminClient = await ApiClient.create(token);
  const res = await adminClient.raw.put(`/admin/prior-auth/${paId}/review`, { data: { decision: 'Denied', denialReasonCode: '50' } });
  await adminClient.dispose();
  if (!res.ok()) throw new Error(`adminDenyPriorAuth failed: ${res.status()} ${await res.text()}`);
}

test.describe('A13 Prior Authorization', () => {
  test('A13-01 @P0 - PA list loads with correct statuses', async ({ page }) => {
    const pa = new PriorAuthPage(page);
    await pa.goto();
    await expect(pa.statCard('Pending')).toBeVisible();
  });

  test('A13-02 @P0 - Create a PA request @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('PriorAuth');
    await api.createPatient({ name: patientName });

    const pa = new PriorAuthPage(page);
    await pa.goto();
    await pa.createPriorAuthRequest({ patientName, serviceType: 'MRI Scan', clinicalNotes: VALID_CLINICAL_NOTES, urgency: 'Routine' });
    await expect(page.getByText(/request (submitted|created) successfully/i)).toBeVisible();
    await expect(pa.row(patientName)).toBeVisible();
  });

  test('A13-03 @P0 - Clinical notes under 20 characters rejected server-side @regression', async ({ api }) => {
    const patient = await api.createPatient({ name: uniquePatientName('ShortNotes') });
    const res = await api.raw.post('/prior-auth', {
      data: { patientId: patient._id || patient.id, patientName: patient.name, serviceType: 'MRI Scan', clinicalNotes: SHORT_CLINICAL_NOTES, urgency: 'Routine' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/clinical notes must be at least 20 characters/i);
  });

  test('A13-05 @P0 - View PA detail renders correct data', async ({ page, api }) => {
    const patient = await api.createPatient({ name: uniquePatientName('PADetail') });
    const created = await api.createPriorAuth({ patientId: patient._id || patient.id, patientName: patient.name });

    const pa = new PriorAuthPage(page);
    await pa.goto();
    await pa.viewDetailsIcon(patient.name).click();
    await expect(page.getByRole('dialog').getByText(created.serviceType)).toBeVisible();
  });

  test('A13-08 @P0 - Submit an appeal on a Denied PA @regression', async ({ page, api }) => {
    const patient = await api.createPatient({ name: uniquePatientName('Appeal') });
    const created = await api.createPriorAuth({ patientId: patient._id || patient.id, patientName: patient.name });
    await adminDenyPriorAuth(created._id || created.id);

    const pa = new PriorAuthPage(page);
    await pa.goto();
    await pa.appealButton(patient.name).click();
    await pa.appealJustificationInput().fill('The requested service is medically necessary given the patient\'s documented history and current presentation.');
    await pa.submitAppealButton().click();
    await expect(page.getByText(/appeal submitted/i)).toBeVisible();
  });

  test('A13-09 @P0 - Second appeal on the same PA is blocked server-side @regression', async ({ api }) => {
    const patient = await api.createPatient({ name: uniquePatientName('DoubleAppeal') });
    const created = await api.createPriorAuth({ patientId: patient._id || patient.id, patientName: patient.name });
    const id = created._id || created.id;
    await adminDenyPriorAuth(id);
    await api.raw.post(`/prior-auth/${id}/appeal`, { data: { appealNotes: 'First appeal — medically necessary.' } });

    const res = await api.raw.post(`/prior-auth/${id}/appeal`, { data: { appealNotes: 'Second appeal attempt.' } });
    expect(res.status()).toBe(400);
  });

  test('A13-11 @P1 - Renewal blocked on a non-Expired PA', async ({ api }) => {
    const patient = await api.createPatient({ name: uniquePatientName('RenewBlocked') });
    const created = await api.createPriorAuth({ patientId: patient._id || patient.id, patientName: patient.name });
    const res = await api.raw.post(`/prior-auth/${created._id || created.id}/renew`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/only expired pas can be renewed/i);
  });
});
