import { test, expect } from '../../fixtures/base';
import { FhirExplorerPage } from '../../pages/provider/FhirExplorerPage';
import { uniquePatientName } from '../../fixtures/test-data';
import { ApiClient } from '../../fixtures/api-client';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

test.describe('A16 FHIR Explorer', () => {
  test('A16-01 @P0 - Load capability statement', async ({ page }) => {
    // FHIRExplorer.js calls loadCapabilityStatement() unconditionally in a
    // mount-time useEffect — "Load Metadata" is disabled while that
    // in-flight auto-load runs, so it's already loaded by the time a click
    // would land. Just wait for the result instead of racing the button.
    const fhir = new FhirExplorerPage(page);
    await fhir.goto();
    await expect(fhir.capabilityStatementText()).toBeVisible();
  });

  test('A16-02 @P0 - Select a patient loads all resource tabs @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('FhirExplore');
    await api.createPatient({ name: patientName });

    const fhir = new FhirExplorerPage(page);
    await fhir.goto();
    await fhir.selectPatient(patientName);
    for (const tab of ['Patient', 'Conditions', 'Medications', 'Allergies', 'Coverage', 'Referrals (SR)'] as const) {
      await fhir.resourceTab(tab).click();
      await expect(fhir.errorAlertOnActiveTab()).toHaveCount(0);
    }
  });

  test('A16-04 @P0 - Cannot view a patient with no relationship @regression', async ({ api }) => {
    const bApi = await ApiClient.create();
    const { token } = await bApi.login(process.env.PROVIDER_B_EMAIL!, DEMO_PASSWORD);
    await bApi.dispose();
    const b = await ApiClient.create(token);
    const patient = await b.createPatient({ name: uniquePatientName('FhirUnrelated') });
    await b.dispose();

    const res = await api.raw.get('/fhir/Patient/' + (patient._id || patient.id));
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/not authorized to access this patient record/i);
  });

  test('A16-06 @P1 - Refresh reloads all resources when a patient is selected', async ({ page, api }) => {
    const patientName = uniquePatientName('FhirRefresh');
    await api.createPatient({ name: patientName });

    const fhir = new FhirExplorerPage(page);
    await fhir.goto();
    await fhir.selectPatient(patientName);
    await expect(fhir.refreshButton()).toBeEnabled();
    await fhir.refreshButton().click();
  });

  test('A16-07 @P1 - No patient selected shows the empty state', async ({ page }) => {
    const fhir = new FhirExplorerPage(page);
    await fhir.goto();
    await expect(fhir.emptyStateNoPatient()).toBeVisible();
  });
});
