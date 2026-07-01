import { BasePage } from '../BasePage';

/** client/src/pages/onboarding/OnboardingWall.js — 4-step timeline. */
export class OnboardingWallPage extends BasePage {
  readonly path = '/onboarding';

  headerTitle = () => this.page.getByText('Complete Your Setup');
  stepsRemainingText = () => this.page.getByText(/steps remaining before full access/i);

  resendEmailButton = () => this.page.getByRole('button', { name: /resend email|didn't receive it\? resend/i });
  getStartedButton = () => this.page.getByRole('button', { name: /get started/i });
  uploadNowButton = () => this.page.getByRole('button', { name: /upload now/i });
  signOutButton = () => this.page.getByRole('button', { name: /sign out/i });

  statusBadge = (text: RegExp) => this.page.getByText(text);

  // Document upload dialog
  licenseNumberInput = () => this.page.getByLabel(/license number/i);
  licenseStateInput = () => this.page.getByLabel(/license state/i);
  documentFileInput = () => this.page.locator('input[type="file"]');
  submitDocumentsButton = () => this.page.getByRole('button', { name: /submit documents/i });
  cancelUploadButton = () => this.page.getByRole('button', { name: /cancel/i });

  async uploadKycDocument(licenseNumber: string, filePath?: string): Promise<void> {
    await this.uploadNowButton().click();
    await this.licenseNumberInput().fill(licenseNumber);
    if (filePath) await this.documentFileInput().setInputFiles(filePath);
    await this.submitDocumentsButton().click();
  }
}

/** client/src/pages/onboarding/OnboardingProfileSetup.js */
export class OnboardingProfileSetupPage extends BasePage {
  readonly path = '/onboarding/profile';

  specialtiesInput = () => this.page.getByLabel(/specialt/i);
  phoneInput = () => this.page.getByLabel(/^phone/i);
  saveAndContinueButton = () => this.page.getByRole('button', { name: /save.*continue|save/i });

  async selectSpecialty(specialty: string): Promise<void> {
    await this.specialtiesInput().click();
    await this.page.getByRole('option', { name: specialty }).click();
    await this.page.keyboard.press('Escape');
  }

  async fillPhone(phone: string): Promise<void> {
    await this.phoneInput().fill(phone);
  }

  async save(): Promise<void> {
    await this.saveAndContinueButton().click();
  }
}
