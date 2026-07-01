import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminDtxManagement.js — 3 tabs: Program Catalog / All Prescriptions / Analytics */
export class AdminDtxPage extends BasePage {
  readonly path = '/admin/dtx';

  tab = (name: 'Program Catalog' | 'All Prescriptions' | 'Analytics') => this.page.getByRole('tab', { name });

  categorySelect = () => this.page.getByLabel(/^category/i);
  showInactiveCheckbox = () => this.page.getByRole('checkbox', { name: /show inactive/i });
  addProgramButton = () => this.page.getByRole('button', { name: /add program/i });

  // Add/Edit Program form
  programNameInput = () => this.page.getByLabel(/program name/i);
  vendorInput = () => this.page.getByLabel(/vendor/i);
  descriptionInput = () => this.page.getByLabel(/description/i);
  tokenRewardInput = () => this.page.getByLabel(/token reward/i);
  saveButton = () => this.page.getByRole('button', { name: /^save$/i });

  programRow = (programName: string) => this.page.getByRole('row', { name: new RegExp(programName) });
  editIcon = (programName: string) => this.programRow(programName).getByRole('button', { name: /edit/i });
  deactivateButton = (programName: string) => this.programRow(programName).getByRole('button', { name: /deactivate/i });
  reactivateButton = (programName: string) => this.programRow(programName).getByRole('button', { name: /reactivate/i });
  statusChip = (programName: string) => this.programRow(programName).getByText(/active|inactive/i);

  // All Prescriptions tab
  prescriptionStatusSelect = () => this.page.getByLabel(/^status/i);

  async addProgram(opts: { name: string; vendor: string; description: string; tokenReward?: number }): Promise<void> {
    await this.addProgramButton().click();
    await this.programNameInput().fill(opts.name);
    await this.vendorInput().fill(opts.vendor);
    await this.descriptionInput().fill(opts.description);
    if (opts.tokenReward !== undefined) await this.tokenRewardInput().fill(String(opts.tokenReward));
    await this.saveButton().click();
  }
}
