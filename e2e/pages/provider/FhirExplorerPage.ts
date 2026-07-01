import { BasePage } from '../BasePage';

/** client/src/pages/fhir/FHIRExplorer.js */
export class FhirExplorerPage extends BasePage {
  readonly path = '/app/fhir';

  loadMetadataButton = () => this.page.getByRole('button', { name: /load metadata/i });
  capabilityStatementText = () => this.page.getByText(/fhir r4 api explorer/i);

  patientSelect = () => this.page.getByLabel(/select patient/i);
  refreshButton = () => this.page.getByRole('button', { name: /reload all resources/i });

  resourceTab = (name: 'Patient' | 'Conditions' | 'Medications' | 'Allergies' | 'Coverage' | 'Referrals (SR)') =>
    this.page.getByRole('tab', { name });

  copyJsonButton = () => this.page.getByRole('button', { name: /copy json/i });
  copiedConfirmation = () => this.page.getByText(/copied to clipboard/i);

  errorAlertOnActiveTab = () => this.page.locator('.MuiAlert-standardError');
  emptyStateNoPatient = () => this.page.getByText(/select a patient to explore their fhir r4 resources/i);

  async selectPatient(patientLabel: string): Promise<void> {
    await this.patientSelect().click();
    await this.page.getByRole('option', { name: new RegExp(patientLabel) }).click();
  }
}
