import { BasePage } from '../BasePage';

/** client/src/pages/dtx/DtxMarketplace.js */
export class DtxMarketplacePage extends BasePage {
  readonly path = '/app/dtx/marketplace';

  searchInput = () => this.page.getByPlaceholder(/search/i);
  evidenceLevelSelect = () => this.page.getByLabel(/evidence level/i);
  categoryTab = (label: string) => this.page.getByRole('tab', { name: label });

  programCard = (programName: string) => this.page.getByText(programName);
  prescribeButton = (programName: string) =>
    this.programCard(programName).locator('xpath=ancestor::*[contains(@class,"MuiCard")][1]').getByRole('button', { name: /prescribe/i });

  // Prescribe modal (PrescribeDtxModal.js)
  selectPatientInput = () => this.page.getByLabel(/patient/i).first();
  clinicalNotesInput = () => this.page.getByLabel(/clinical notes/i);
  prescribeProgramButton = () => this.page.getByRole('button', { name: /prescribe program/i });
  missingPatientError = () => this.page.getByText(/please select a patient to prescribe/i);

  async prescribe(programName: string, patientName: string, clinicalNotes?: string): Promise<void> {
    await this.prescribeButton(programName).click();
    await this.selectPatientInput().fill(patientName);
    await this.page.getByRole('option', { name: new RegExp(patientName) }).first().click();
    if (clinicalNotes) await this.clinicalNotesInput().fill(clinicalNotes);
    await this.prescribeProgramButton().click();
  }
}

/** client/src/pages/dtx/DtxPrescriptions.js */
export class DtxPrescriptionsPage extends BasePage {
  readonly path = '/app/dtx/prescriptions';

  statusTab = (name: 'All' | 'Prescribed' | 'Enrolled' | 'Active' | 'Completed' | 'Dropped') =>
    this.page.getByRole('tab', { name });

  row = (patientName: string) => this.page.getByRole('row', { name: new RegExp(patientName) });
  updateButton = (patientName: string) => this.row(patientName).getByRole('button', { name: /update/i });

  // UpdateStatusDialog
  statusSelect = () => this.page.getByLabel(/^status/i);
  engagementScoreSlider = () => this.page.getByRole('slider');
  outcomeNotesInput = () => this.page.getByLabel(/outcome notes|notes/i);
  updateStatusSubmitButton = () => this.page.getByRole('button', { name: /update status|save/i });
  missingEngagementScoreError = () => this.page.getByText(/engagement score is required/i);
  missingOutcomeNotesError = () => this.page.getByText(/outcome notes are required/i);
  invalidTransitionError = () => this.page.getByText(/cannot transition from/i);

  async updateStatus(patientName: string, newStatus: string, opts: { engagementScore?: number; outcomeNotes?: string } = {}): Promise<void> {
    await this.updateButton(patientName).click();
    await this.selectMuiOption(/^status/i, newStatus);
    if (opts.engagementScore !== undefined) {
      await this.engagementScoreSlider().fill(String(opts.engagementScore));
    }
    if (opts.outcomeNotes) await this.outcomeNotesInput().fill(opts.outcomeNotes);
    await this.updateStatusSubmitButton().click();
  }
}
