import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminAppointments.js — 3 tabs: All Appointments / Analytics / Provider Utilization */
export class AdminAppointmentsPage extends BasePage {
  readonly path = '/admin/appointments';

  tab = (name: 'All Appointments' | 'Analytics' | 'Provider Utilization') => this.page.getByRole('tab', { name });

  searchInput = () => this.page.getByLabel(/search \(id, patient, provider\)/i);
  statusSelect = () => this.page.getByLabel(/^status/i);
  typeSelect = () => this.page.getByLabel(/type/i);
  providerNameInput = () => this.page.getByLabel(/provider/i);

  row = (idOrPatient: string) => this.page.getByRole('row', { name: new RegExp(idOrPatient) });
  viewIcon = (rowMatch: string) => this.row(rowMatch).getByRole('button', { name: /view/i });

  // Detail dialog
  markCompletedButton = () => this.page.getByRole('button', { name: /mark completed/i });
  markNoShowButton = () => this.page.getByRole('button', { name: /mark no-show/i });
  cancelButton = () => this.page.getByRole('button', { name: /^cancel$/i });

  // Provider Utilization tab
  dateRangeSelect = () => this.page.getByLabel(/date range/i);
  providerUtilizationRow = (providerName: string) => this.page.getByRole('row', { name: new RegExp(providerName) });

  async setDateRange(range: '7 days' | '30 days' | '90 days' | 'Year to Date'): Promise<void> {
    await this.selectMuiOption(/date range/i, range);
  }
}
