import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminKYC.js */
export class AdminKycPage extends BasePage {
  readonly path = '/admin/kyc';

  refreshButton = () => this.page.getByRole('button', { name: /refresh/i });
  row = (providerName: string) => this.page.getByRole('row', { name: new RegExp(providerName) });

  approveButton = (providerName: string) => this.row(providerName).getByRole('button', { name: /approve/i });
  rejectButton = (providerName: string) => this.row(providerName).getByRole('button', { name: /reject/i });
  editProfileButton = (providerName: string) => this.row(providerName).getByRole('button', { name: /edit profile/i });
  deleteButton = (providerName: string) => this.row(providerName).getByRole('button', { name: /delete/i });
  viewDocumentButton = (providerName: string) => this.row(providerName).getByRole('button', { name: /view document/i });
  resendVerificationButton = (providerName: string) => this.row(providerName).getByRole('button', { name: /resend verification/i });

  rejectionReasonInput = () => this.page.getByLabel(/rejection reason/i);
  confirmButton = () => this.page.getByRole('button', { name: /confirm/i });

  async approve(providerName: string): Promise<void> {
    await this.approveButton(providerName).click();
    await this.confirmButton().click();
  }

  async reject(providerName: string, reason: string): Promise<void> {
    await this.rejectButton(providerName).click();
    await this.rejectionReasonInput().fill(reason);
    await this.confirmButton().click();
  }
}
