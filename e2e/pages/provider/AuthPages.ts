import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

/** client/src/pages/auth/Login.js */
export class LoginPage extends BasePage {
  readonly path = '/login';

  emailInput = () => this.page.getByLabel(/^email/i);
  // Anchored — an unanchored /password/i also matches the "toggle password
  // visibility" IconButton's aria-label, causing a strict-mode violation.
  passwordInput = () => this.page.getByLabel(/^password/i);
  signInButton = () => this.page.getByRole('button', { name: /sign in/i });
  forgotPasswordLink = () => this.page.getByText(/forgot password/i);
  registerLink = () => this.page.getByRole('link', { name: /sign up|register/i });
  adminLoginLink = () => this.page.getByRole('link', { name: /admin login/i });

  async login(email: string, password: string): Promise<void> {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.signInButton().click();
  }
}

/** client/src/pages/auth/Register.js — 3-step wizard: NPI lookup -> Account Setup -> Verification */
export class RegisterPage extends BasePage {
  readonly path = '/register';

  roleChip = (role: 'doctor' | 'clinic' | 'hospital' | 'lab') => this.page.getByRole('button', { name: new RegExp(role, 'i') });
  npiInput = () => this.page.getByLabel(/npi/i);
  lookUpButton = () => this.page.getByRole('button', { name: /look up/i });
  skipNpiLookupButton = () => this.page.getByRole('button', { name: /skip npi lookup/i });
  confirmNpiButton = () => this.page.getByRole('button', { name: /yes, that's me/i });
  signInInsteadButton = () => this.page.getByRole('button', { name: /sign in/i });

  // Step 1 — Account Setup
  firstNameInput = () => this.page.getByLabel(/first name/i);
  lastNameInput = () => this.page.getByLabel(/last name/i);
  emailInput = () => this.page.getByLabel(/^email/i);
  organizationInput = () => this.page.getByLabel(/organization/i);
  passwordInput = () => this.page.getByLabel(/^password/i);
  confirmPasswordInput = () => this.page.getByLabel(/confirm password/i);
  createAccountButton = () => this.page.getByRole('button', { name: /create account/i });

  // Step 2 — Verification
  resendButton = () => this.page.getByRole('button', { name: /resend/i });
  goToSignInLink = () => this.page.getByRole('link', { name: /go to sign in/i });

  async lookupNpi(npi: string): Promise<void> {
    await this.npiInput().fill(npi);
    await this.lookUpButton().click();
  }

  async completeAccountSetup(fields: {
    firstName: string;
    lastName: string;
    email: string;
    organization: string;
    password: string;
  }): Promise<void> {
    await this.firstNameInput().fill(fields.firstName);
    await this.lastNameInput().fill(fields.lastName);
    await this.emailInput().fill(fields.email);
    await this.organizationInput().fill(fields.organization);
    await this.passwordInput().fill(fields.password);
    await this.confirmPasswordInput().fill(fields.password);
    await this.createAccountButton().click();
  }
}

/** client/src/pages/auth/ForgotPassword.js (route confirmed via App.js route table) */
export class ForgotPasswordPage extends BasePage {
  readonly path = '/forgot-password';

  emailInput = () => this.page.getByLabel(/email/i);
  submitButton = () => this.page.getByRole('button', { name: /send reset link/i });

  async submit(email: string): Promise<void> {
    await this.emailInput().fill(email);
    await this.submitButton().click();
  }

  async expectGenericConfirmation(): Promise<void> {
    await expect(this.page.getByText(/if your email is registered/i)).toBeVisible();
  }
}
