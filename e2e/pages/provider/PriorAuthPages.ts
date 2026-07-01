import { BasePage } from '../BasePage';

/** client/src/pages/prior-auth/PriorAuth.js + CreatePriorAuth.js (3-step: Patient & Service -> Clinical Details -> Review & Submit) */
export class PriorAuthPage extends BasePage {
  readonly path = '/app/prior-auth';

  newRequestButton = () => this.page.getByRole('button', { name: /new request/i });
  refreshButton = () => this.page.getByRole('button', { name: /refresh/i });
  searchInput = () => this.page.getByPlaceholder(/search patient, service, provider/i);
  statusFilterSelect = () => this.page.getByLabel(/status/i);

  statCard = (label: 'Pending' | 'Under Review' | 'Approved' | 'Denied' | 'Appealing' | 'Expired') => this.page.getByText(label);

  row = (patientOrService: string) => this.page.getByRole('row', { name: new RegExp(patientOrService) });
  viewDetailsIcon = (rowMatch: string) => this.row(rowMatch).getByRole('button', { name: /view/i });
  appealButton = (rowMatch: string) => this.row(rowMatch).getByRole('button', { name: /appeal/i });
  renewButton = (rowMatch: string) => this.row(rowMatch).getByRole('button', { name: /renew/i });

  // Create dialog — Step 1: Patient & Service
  selectPatientInput = () => this.page.getByLabel(/patient/i).first();
  serviceTypeSelect = () => this.page.getByLabel(/service type/i);
  cptCodeInput = () => this.page.getByLabel(/cpt code/i);
  urgencySelect = () => this.page.getByLabel(/urgency/i);

  // Step 2: Clinical Details
  clinicalNotesInput = () => this.page.getByLabel(/clinical notes/i);
  addDiagnosisCodeButton = () => this.page.getByRole('button', { name: /add.*diagnosis/i });

  nextButton = () => this.page.getByRole('button', { name: /^next$/i });
  backButton = () => this.page.getByRole('button', { name: /^back$/i });
  submitRequestButton = () => this.page.getByRole('button', { name: /submit request/i });

  // Detail dialog
  auditTrailButton = () => this.page.getByRole('button', { name: /audit trail/i });
  clinicalNotesThreadInput = () => this.page.getByPlaceholder(/add a clinical note/i);
  sendNoteButton = () => this.page.getByRole('button', { name: /send/i });

  // Appeal dialog
  aiDraftButton = () => this.page.getByRole('button', { name: /ai draft/i });
  appealJustificationInput = () => this.page.getByLabel(/appeal justification/i);
  submitAppealButton = () => this.page.getByRole('button', { name: /submit appeal/i });

  async createPriorAuthRequest(opts: {
    patientName: string;
    serviceType: string;
    clinicalNotes: string;
    urgency?: 'Routine' | 'Urgent' | 'Emergent';
  }): Promise<void> {
    await this.newRequestButton().click();
    await this.selectPatientInput().fill(opts.patientName);
    await this.page.getByRole('option', { name: new RegExp(opts.patientName) }).first().click();
    await this.selectMuiOption(/service type/i, opts.serviceType);
    if (opts.urgency) await this.selectMuiOption(/urgency/i, opts.urgency);
    await this.nextButton().click();
    await this.clinicalNotesInput().fill(opts.clinicalNotes);
    await this.nextButton().click();
    await this.submitRequestButton().click();
  }
}
