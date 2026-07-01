import { BasePage } from '../BasePage';

/** client/src/pages/ambient/AmbientRecorder.js */
export class AmbientRecorderPage extends BasePage {
  readonly path = '/app/ambient';

  tab = (name: 'New Recording' | 'My Sessions') => this.page.getByRole('tab', { name: new RegExp(name, 'i') });

  selectPatientInput = () => this.page.getByLabel(/patient/i).first();
  chiefComplaintInput = () => this.page.getByLabel(/chief complaint/i);
  nextButton = () => this.page.getByRole('button', { name: /next/i });

  startRecordingButton = () => this.page.getByRole('button', { name: /start recording/i });
  stopRecordingButton = () => this.page.getByRole('button', { name: /stop recording/i });
  transcriptArea = () => this.page.getByTestId('transcript').or(this.page.locator('[class*="transcript"]'));
  submitForAnalysisButton = () => this.page.getByRole('button', { name: /submit for ai analysis|finalizing transcript/i });

  editedSummaryInput = () => this.page.getByLabel(/clinical summary/i);
  editedNoteInput = () => this.page.getByLabel(/referral note/i);
  urgencySelect = () => this.page.getByLabel(/urgency/i);
  approveButton = () => this.page.getByRole('button', { name: /^approve/i });
  rejectButton = () => this.page.getByRole('button', { name: /^reject/i });

  sessionRow = (patientName: string) => this.page.getByRole('row', { name: new RegExp(patientName) });

  async startNewSession(patientName: string, chiefComplaint: string): Promise<void> {
    await this.selectPatientInput().fill(patientName);
    await this.page.getByRole('option', { name: new RegExp(patientName) }).first().click();
    await this.chiefComplaintInput().fill(chiefComplaint);
    await this.nextButton().click();
    await this.startRecordingButton().click();
  }
}
