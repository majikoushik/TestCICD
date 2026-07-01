import { test, expect } from '../../fixtures/base';
import { AdminAiConfigPage, AdminAnalyticsPage } from '../../pages/admin/AdminAiConfigPage';
import { uniquePatientName } from '../../fixtures/test-data';

test.describe('B10 Admin — AI Configuration & Analytics', () => {
  test('B10-01 @P0 - AI Configuration loads default values @regression', async ({ page, api }) => {
    const config = new AdminAiConfigPage(page);
    await config.goto();
    await expect(config.autoApproveThresholdInput()).toHaveValue('0.95');
    await expect(config.minConfidenceInput()).toHaveValue('0.8');
    await expect(config.manualReviewThresholdInput()).toHaveValue('0.65');
  });

  test('B10-02 @P0 - Auto-approve threshold change actually changes PA behavior @regression', async ({ api }) => {
    // Regression test for the fixed bug: azureAIService.js previously used a
    // hardcoded 0.92 regardless of this setting. Set a very strict threshold
    // (0.999) that essentially no AI confidence score should clear, then
    // confirm a freshly-submitted PA is not silently auto-approved by it.
    await api.raw.put('/admin/ai-config/priorAuth.autoApproveThreshold', { data: { value: 0.999 } });

    const patient = await api.createPatient({ name: uniquePatientName('AiConfigPA') });
    const created = await api.createPriorAuth({ patientId: patient._id || patient.id, patientName: patient.name });
    await new Promise((r) => setTimeout(r, 2000)); // allow async AI analysis to complete

    const res = await api.raw.get(`/prior-auth/${created._id || created.id}`);
    const pa = (await res.json()).data;
    expect(pa.autoApproved).not.toBe(true);

    await api.raw.put('/admin/ai-config/priorAuth.autoApproveThreshold', { data: { value: 0.95 } }); // restore default
  });

  test('B10-03 @P1 - Reset AI Configuration reverts to defaults @regression', async ({ page, api }) => {
    // AdminAIManagement.js has no "Reset" button in the UI — per
    // QA_TEST_SCENARIOS.md this scenario is tested via the API directly.
    await api.raw.put('/admin/ai-config/priorAuth.autoApproveThreshold', { data: { value: 0.5 } });

    const res = await api.raw.post('/admin/ai-config/reset');
    expect(res.ok()).toBeTruthy();

    const config = new AdminAiConfigPage(page);
    await config.goto();
    await expect(config.autoApproveThresholdInput()).toHaveValue('0.95');
  });

  test('B10-04 @P1 - Admin platform-wide analytics dashboard renders', async ({ page }) => {
    const analytics = new AdminAnalyticsPage(page);
    await analytics.goto();
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
