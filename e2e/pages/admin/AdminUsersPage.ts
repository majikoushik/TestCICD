import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminUsers.js */
export class AdminUsersPage extends BasePage {
  readonly path = '/admin/users';

  searchInput = () => this.page.getByLabel(/search users/i);
  filterButton = () => this.page.getByRole('button', { name: /filter/i });
  refreshButton = () => this.page.getByRole('button', { name: /refresh/i });
  addNewUserButton = () => this.page.getByRole('button', { name: /add new user/i });

  row = (email: string) => this.page.getByRole('row', { name: new RegExp(email) });
  editIcon = (email: string) => this.row(email).getByRole('button', { name: /edit/i });
  unlockIcon = (email: string) => this.row(email).getByRole('button', { name: /unlock/i });
  resetPasswordIcon = (email: string) => this.row(email).getByRole('button', { name: /reset password/i });
  deleteIcon = (email: string) => this.row(email).getByRole('button', { name: /delete/i });

  // Edit/Add dialog
  nameInput = () => this.page.getByLabel(/^name/i);
  emailInput = () => this.page.getByLabel(/^email/i);
  roleSelect = () => this.page.getByLabel(/^role/i);
  activeSwitch = () => this.page.getByRole('checkbox', { name: /active/i });
  saveButton = () => this.page.getByRole('button', { name: /^save$/i });

  confirmButton = () => this.page.getByRole('button', { name: /confirm|yes/i });
  tempPasswordDialog = () => this.page.getByText(/temporary password/i);

  async setActive(email: string, active: boolean): Promise<void> {
    await this.editIcon(email).click();
    const isChecked = await this.activeSwitch().isChecked();
    if (isChecked !== active) await this.activeSwitch().click();
    await this.saveButton().click();
  }
}
