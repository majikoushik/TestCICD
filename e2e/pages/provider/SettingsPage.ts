import { BasePage } from '../BasePage';

/** client/src/pages/settings/Settings.js — 6 tabs */
export class SettingsPage extends BasePage {
  readonly path = '/app/settings';

  tab = (name: 'Profile' | 'Practice' | 'Referral Prefs' | 'Notifications' | 'AI & Tools' | 'Security') =>
    this.page.getByRole('tab', { name });

  // Profile tab
  bioInput = () => this.page.getByLabel(/bio/i);
  avatarUploadInput = () => this.page.locator('input[type="file"]');
  saveProfileButton = () => this.page.getByRole('button', { name: /save profile/i });

  // Practice tab
  acceptingNewPatientsSwitch = () => this.page.getByRole('checkbox', { name: /accepting new patients/i });
  maxNewPatientsSlider = () => this.page.getByRole('slider').first();
  savePracticeButton = () => this.page.getByRole('button', { name: /save practice settings/i });

  // Referral Prefs tab
  autoAcceptFromVerifiedSwitch = () => this.page.getByRole('checkbox', { name: /automatically accept referrals from kyc-verified/i });
  saveReferralPrefsButton = () => this.page.getByRole('button', { name: /save referral preferences/i });

  // Notifications tab
  newReferralSwitch = () => this.page.getByRole('checkbox', { name: /new referral/i }).first();
  saveNotificationsButton = () => this.page.getByRole('button', { name: /save notification settings/i });

  // AI & Tools tab
  enableAiMatchingSwitch = () => this.page.getByRole('checkbox', { name: /enable ai matching/i });
  saveAiSettingsButton = () => this.page.getByRole('button', { name: /save ai settings/i });

  // Security tab
  changePasswordButton = () => this.page.getByRole('button', { name: /change password/i });
  currentPasswordInput = () => this.page.getByLabel(/current password/i);
  newPasswordInput = () => this.page.getByLabel(/^new password/i);
  confirmNewPasswordInput = () => this.page.getByLabel(/confirm.*password/i);
  submitPasswordChangeButton = () => this.page.getByRole('button', { name: /change password/i }).last();
  saveSecurityButton = () => this.page.getByRole('button', { name: /save security/i });

  async changePassword(current: string, next: string): Promise<void> {
    await this.changePasswordButton().click();
    await this.currentPasswordInput().fill(current);
    await this.newPasswordInput().fill(next);
    await this.confirmNewPasswordInput().fill(next);
    await this.submitPasswordChangeButton().click();
  }
}
