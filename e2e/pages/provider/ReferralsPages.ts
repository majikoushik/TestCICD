import { Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

/** client/src/pages/referrals/Referrals.js */
export class ReferralsPage extends BasePage {
  readonly path = '/app/referrals';

  createReferralButton = () => this.page.getByRole('button', { name: 'Create Referral' });
  searchInput = () => this.page.getByPlaceholder(/search/i);
  tab = (name: 'All' | 'Pending' | 'Accepted' | 'Completed' | 'Rejected' | 'Cancelled') =>
    this.page.getByRole('tab', { name: new RegExp(name) });

  row = (patientOrReasonText: string): Locator => this.page.getByRole('row', { name: new RegExp(patientOrReasonText) });
  rowActionMenuButton = (rowText: string) => this.row(rowText).getByRole('button', { name: /more|⋮/i });

  acceptReferralMenuItem = () => this.page.getByRole('menuitem', { name: 'Accept Referral' });
  rejectReferralMenuItem = () => this.page.getByRole('menuitem', { name: 'Reject Referral' });
  markAsCompletedMenuItem = () => this.page.getByRole('menuitem', { name: 'Mark as Completed' });
  viewDetailsMenuItem = () => this.page.getByRole('menuitem', { name: 'View Details' });
  noStatusActionsMenuItem = () => this.page.getByRole('menuitem', { name: /no status actions available/i });

  async openRowActions(rowText: string): Promise<void> {
    await this.rowActionMenuButton(rowText).click();
  }
}

/** client/src/pages/referrals/CreateReferral.js — 3-step wizard */
export class CreateReferralPage extends BasePage {
  readonly path = '/app/referrals/create';

  // Step 1 — Select Patient
  selectPatientInput = () => this.page.getByLabel(/patient name/i);
  patientInfoPanel = () => this.page.getByText('Patient Information');

  // Step 2 — Provider Information
  specialtyInput = () => this.page.getByLabel(/specialty/i);
  aiSuggestionCard = () => this.page.locator('[class*="AIProviderSuggestion"], [class*="suggestion"]').first();
  receivingProviderInput = () => this.page.getByLabel(/receiving provider|provider/i).last();

  // Step 3 — Referral Details
  reasonInput = () => this.page.getByLabel(/reason for referral|reason/i);
  urgencySelect = () => this.page.getByLabel(/urgency/i);
  notesInput = () => this.page.getByLabel(/^notes/i);

  nextButton = () => this.page.getByRole('button', { name: /next/i });
  backButton = () => this.page.getByRole('button', { name: /back/i });
  createReferralSubmitButton = () => this.page.getByRole('button', { name: /create referral|save/i });

  async selectPatientByName(name: string): Promise<void> {
    await this.selectPatientInput().fill(name);
    await this.page.getByRole('option', { name: new RegExp(name) }).first().click();
  }

  async fillReferralDetails(reason: string, urgency?: 'Routine' | 'Urgent' | 'Emergency'): Promise<void> {
    await this.reasonInput().fill(reason);
    if (urgency) await this.selectMuiOption(/urgency/i, urgency);
  }
}

/** client/src/pages/referrals/ReferralDetail.js */
export class ReferralDetailPage extends BasePage {
  readonly path = '';

  gotoReferral(id: string) {
    return this.page.goto(`/app/referrals/${id}`);
  }

  tab = (name: 'Patient Info' | 'Billing' | 'Attached Records' | 'Notes') => this.page.getByRole('tab', { name });

  updateStatusButton = () => this.page.getByRole('button', { name: /update status/i });
  scheduleAppointmentButton = () => this.page.getByRole('button', { name: /schedule appointment/i });
  prescribeDtxButton = () => this.page.getByRole('button', { name: /prescribe dtx/i });

  statusOption = (status: 'Accept' | 'Reject' | 'Complete' | 'Cancel') => this.page.getByRole('menuitem', { name: status });
  notesTextarea = () => this.page.getByLabel(/notes/i);
  confirmButton = () => this.page.getByRole('button', { name: /confirm/i });

  async updateStatus(status: 'Accept' | 'Reject' | 'Complete' | 'Cancel', notes?: string): Promise<void> {
    await this.updateStatusButton().click();
    await this.statusOption(status).click();
    if (notes) await this.notesTextarea().fill(notes);
    await this.confirmButton().click();
  }
}
