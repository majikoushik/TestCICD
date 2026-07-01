import { test, expect } from '../../fixtures/base';
import { DtxMarketplacePage, DtxPrescriptionsPage } from '../../pages/provider/DtxPages';
import { uniquePatientName } from '../../fixtures/test-data';

test.describe('A14 Digital Therapeutics (DTx) Marketplace', () => {
  test('A14-01 @P0 - Marketplace loads catalog with evidence-level badges', async ({ page, api }) => {
    const programs = await api.getDtxPrograms();
    test.skip(programs.length === 0, 'No active DTx programs seeded in this environment.');

    const marketplace = new DtxMarketplacePage(page);
    await marketplace.goto();
    await expect(marketplace.programCard(programs[0].name)).toBeVisible();
  });

  test('A14-03 @P0 - Prescribe a program creates a prescribed record @regression', async ({ page, api }) => {
    const programs = await api.getDtxPrograms();
    test.skip(programs.length === 0, 'No active DTx programs seeded in this environment.');
    const patientName = uniquePatientName('DtxPrescribe');
    await api.createPatient({ name: patientName });

    const marketplace = new DtxMarketplacePage(page);
    await marketplace.goto();
    await marketplace.prescribe(programs[0].name, patientName, 'E2E_ prescribing for automated test coverage.');
    await expect(page.getByText(/prescribed successfully/i)).toBeVisible();
  });

  test('A14-04 @P1 - Prescribe without a patient is blocked', async ({ page, api }) => {
    const programs = await api.getDtxPrograms();
    test.skip(programs.length === 0, 'No active DTx programs seeded in this environment.');

    const marketplace = new DtxMarketplacePage(page);
    await marketplace.goto();
    await marketplace.prescribeButton(programs[0].name).click();
    await marketplace.prescribeProgramButton().click();
    await expect(marketplace.missingPatientError()).toBeVisible();
  });

  test('A14-05 @P0 - Prescriptions list loads and filters by status tab', async ({ page }) => {
    const prescriptions = new DtxPrescriptionsPage(page);
    await prescriptions.goto();
    for (const tab of ['All', 'Prescribed', 'Enrolled', 'Active', 'Completed', 'Dropped'] as const) {
      await prescriptions.statusTab(tab).click();
      await expect(prescriptions.statusTab(tab)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('A14-07 @P0 - Completion requires engagement score and outcome notes @regression', async ({ api }) => {
    const programs = await api.getDtxPrograms();
    test.skip(programs.length === 0, 'No active DTx programs seeded in this environment.');
    const patient = await api.createPatient({ name: uniquePatientName('DtxComplete') });
    const rx = await api.createDtxPrescription({ programId: programs[0]._id || programs[0].id, patientId: patient._id || patient.id, patientName: patient.name });
    const id = rx._id || rx.id;
    await api.setDtxPrescriptionStatus(id, 'enrolled');
    await api.setDtxPrescriptionStatus(id, 'active');

    const res = await api.raw.put(`/dtx/prescriptions/${id}/status`, { data: { status: 'completed' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/engagement score is required/i);
  });

  test('A14-08 @P0 - Invalid status jump is rejected server-side @regression', async ({ api }) => {
    const programs = await api.getDtxPrograms();
    test.skip(programs.length === 0, 'No active DTx programs seeded in this environment.');
    const patient = await api.createPatient({ name: uniquePatientName('DtxInvalidJump') });
    const rx = await api.createDtxPrescription({ programId: programs[0]._id || programs[0].id, patientId: patient._id || patient.id, patientName: patient.name });

    const res = await api.raw.put(`/dtx/prescriptions/${rx._id || rx.id}/status`, { data: { status: 'completed' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cannot transition from 'prescribed' to 'completed'/i);
  });

  test('A14-09 @P0 - Token reward on completion @regression', async ({ api }) => {
    const programs = await api.getDtxPrograms();
    test.skip(programs.length === 0, 'No active DTx programs seeded in this environment.');
    const patient = await api.createPatient({ name: uniquePatientName('DtxReward') });
    const rx = await api.createDtxPrescription({ programId: programs[0]._id || programs[0].id, patientId: patient._id || patient.id, patientName: patient.name });
    const id = rx._id || rx.id;
    await api.setDtxPrescriptionStatus(id, 'enrolled');
    await api.setDtxPrescriptionStatus(id, 'active');

    const before = await api.getTokenBalance();
    await api.raw.put(`/dtx/prescriptions/${id}/status`, { data: { status: 'completed', engagementScore: 85, outcomeNotes: 'Patient engaged consistently and reported improvement.' } });
    const after = await api.getTokenBalance();
    expect(after).toBeGreaterThan(before);
  });

  test('A14-10 @P1 - No token reward when dropped', async ({ api }) => {
    const programs = await api.getDtxPrograms();
    test.skip(programs.length === 0, 'No active DTx programs seeded in this environment.');
    const patient = await api.createPatient({ name: uniquePatientName('DtxDrop') });
    const rx = await api.createDtxPrescription({ programId: programs[0]._id || programs[0].id, patientId: patient._id || patient.id, patientName: patient.name });
    const id = rx._id || rx.id;
    await api.setDtxPrescriptionStatus(id, 'enrolled');

    const before = await api.getTokenBalance();
    await api.setDtxPrescriptionStatus(id, 'dropped');
    const after = await api.getTokenBalance();
    expect(after).toBe(before);
  });
});
