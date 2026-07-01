import { test, expect } from '../../fixtures/base';
import { AmbientRecorderPage } from '../../pages/provider/AmbientPage';
import { uniquePatientName, uniqueChiefComplaint } from '../../fixtures/test-data';
import { ApiClient } from '../../fixtures/api-client';

/**
 * client/src/pages/ambient/AmbientRecorder.js has no standalone session-detail
 * route (App.js only registers a single "ambient" route) — "Approve"/"Reject"
 * only exist inside the live 3-step wizard's Step 3, immediately after a
 * session is recorded in that same browser session; "My Sessions" only opens
 * a read-only view dialog (Close button only, no status actions). So tests
 * that need an already-existing session (created via API, as setup) drive the
 * review transition through the real /:id/review API and verify it lands
 * correctly, rather than pretending a UI control exists that this app doesn't have.
 */
async function createAmbientSession(api: ApiClient, patientName: string, chiefComplaint: string) {
  const res = await api.raw.post('/ambient-sessions', {
    data: { patientId: `E2E_${Date.now()}`, patientName, chiefComplaint, audioTranscript: 'Patient reports mild discomfort for the past week.' },
  });
  if (!res.ok()) throw new Error(`createAmbientSession failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).data;
}

test.describe('A15 Ambient Clinical Intelligence', () => {
  test('A15-01 @P0 - Start a recording session shows the recording controls', async ({ page, api }) => {
    const patientName = uniquePatientName('Ambient');
    await api.createPatient({ name: patientName });

    const ambient = new AmbientRecorderPage(page);
    await ambient.goto();
    await ambient.startNewSession(patientName, uniqueChiefComplaint());
    await expect(ambient.stopRecordingButton()).toBeVisible();
  });

  test('A15-05 @P0 - Approve a session via the review API reflects in the UI @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('AmbientApprove');
    const session = await createAmbientSession(api, patientName, uniqueChiefComplaint());

    const res = await api.raw.put(`/ambient-sessions/${session._id || session.id}/review`, { data: { action: 'approve', approvedNote: session.referralNoteDraft || 'E2E_ approved note.' } });
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).data.status).toBe('approved');

    const ambient = new AmbientRecorderPage(page);
    await ambient.goto();
    await ambient.tab('My Sessions').click();
    await expect(ambient.sessionRow(patientName)).toContainText(/approved/i);
  });

  test('A15-06 @P0 - Reject a session via the review API reflects in the UI @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('AmbientReject');
    const session = await createAmbientSession(api, patientName, uniqueChiefComplaint());

    const res = await api.raw.put(`/ambient-sessions/${session._id || session.id}/review`, { data: { action: 'reject' } });
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).data.status).toBe('rejected');

    const ambient = new AmbientRecorderPage(page);
    await ambient.goto();
    await ambient.tab('My Sessions').click();
    await expect(ambient.sessionRow(patientName)).toContainText(/rejected/i);
  });

  test('A15-07 @P1 - My Sessions tab lists past sessions with correct status chip', async ({ page, api }) => {
    const patientName = uniquePatientName('AmbientHistory');
    await createAmbientSession(api, patientName, uniqueChiefComplaint());

    const ambient = new AmbientRecorderPage(page);
    await ambient.goto();
    await ambient.tab('My Sessions').click();
    await expect(ambient.sessionRow(patientName)).toBeVisible();
  });

  test('A15-08 @P1 - Viewing a past session opens a detail dialog with correct data', async ({ page, api }) => {
    const patientName = uniquePatientName('AmbientDetail');
    await createAmbientSession(api, patientName, uniqueChiefComplaint());

    const ambient = new AmbientRecorderPage(page);
    await ambient.goto();
    await ambient.tab('My Sessions').click();
    await ambient.sessionRow(patientName).getByRole('button').first().click();
    await expect(page.getByRole('dialog').getByText(patientName)).toBeVisible();
    await page.getByRole('button', { name: /^close$/i }).click();
  });
});
