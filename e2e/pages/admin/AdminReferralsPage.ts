import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminReferrals.js */
export class AdminReferralsPage extends BasePage {
  readonly path = '/admin/referrals';

  searchInput = () => this.page.getByLabel(/^search/i);
  statusSelect = () => this.page.getByLabel(/^status/i);
  hasDisputeSelect = () => this.page.getByLabel(/has dispute/i);
  viewStatsButton = () => this.page.getByRole('button', { name: /view stats/i });

  tab = (name: 'All Referrals' | 'Pending' | 'Accepted' | 'Completed' | 'Cancelled/Rejected' | 'Workflow Settings') =>
    this.page.getByRole('tab', { name: new RegExp(name.replace('/', '.')) });

  row = (patientOrProvider: string) => this.page.getByRole('row', { name: new RegExp(patientOrProvider) });
  viewDetailsIcon = (rowMatch: string) => this.row(rowMatch).getByRole('button', { name: /view/i });
  disputeChip = (rowMatch: string) => this.row(rowMatch).getByText(/pending|resolved|rejected|none/i);

  // Workflow Settings tab
  slaAcceptHoursInput = () => this.page.getByLabel(/acceptance sla/i);
  slaCompleteDaysInput = () => this.page.getByLabel(/completion sla/i);
  aiAutoAssignmentSwitch = () => this.page.getByRole('checkbox', { name: /ai auto-assignment/i });
  saveSettingsButton = () => this.page.getByRole('button', { name: /save settings/i });
  settingsSavedSnackbar = () => this.page.getByText(/workflow settings saved/i);

  // Stats dialog
  exportReportButton = () => this.page.getByRole('button', { name: /export report/i });

  async filterByDispute(value: 'All' | 'Yes' | 'No'): Promise<void> {
    await this.selectMuiOption(/has dispute/i, value);
  }
}
