import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminLogin.js */
export class AdminLoginPage extends BasePage {
  readonly path = '/admin/login';

  emailInput = () => this.page.getByLabel(/admin email/i);
  passwordInput = () => this.page.getByLabel(/^password/i);
  signInButton = () => this.page.getByRole('button', { name: /sign in/i });
  returnToUserLoginButton = () => this.page.getByRole('button', { name: /return to user login/i });

  async login(email: string, password: string): Promise<void> {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.signInButton().click();
  }
}
