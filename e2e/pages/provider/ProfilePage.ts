import { BasePage } from '../BasePage';

/** client/src/pages/profile/Profile.js */
export class ProfilePage extends BasePage {
  readonly path = '/app/profile';

  editButton = () => this.page.getByRole('button', { name: /^edit$/i });
  cancelButton = () => this.page.getByRole('button', { name: /^cancel$/i });
  saveButton = () => this.page.getByRole('button', { name: /^save$/i });

  bioInput = () => this.page.getByLabel(/bio/i);
  phoneInput = () => this.page.getByLabel(/^phone/i);

  verifyIdentityButton = () => this.page.getByRole('button', { name: /verify identity/i });
  startVerificationButton = () => this.page.getByRole('button', { name: /start verification/i });
  verifiedBadge = () => this.page.getByText(/your blockchain identity is verified/i);

  blockchainIdCopyIcon = () => this.page.getByText('Blockchain ID').locator('xpath=following::button[1]');
  walletAddressCopyIcon = () => this.page.getByText('Wallet Address').locator('xpath=following::button[1]');
  copiedConfirmation = () => this.page.getByText(/copied to clipboard/i);

  async startVerification(): Promise<void> {
    await this.verifyIdentityButton().click();
    await this.startVerificationButton().click();
  }
}
