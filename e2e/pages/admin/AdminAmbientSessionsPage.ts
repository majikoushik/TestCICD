import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminAmbientSessions.js */
export class AdminAmbientSessionsPage extends BasePage {
  readonly path = '/admin/ambient-sessions';

  statCard = (label: 'Total Sessions' | 'Approved' | 'Pending Review' | 'Submitted') => this.page.getByText(label);

  searchInput = () => this.page.getByPlaceholder(/search patient or chief complaint/i);
  statusSelect = () => this.page.getByLabel(/^status/i);
  urgencySelect = () => this.page.getByLabel(/^urgency/i);

  row = (patientName: string) => this.page.getByRole('row', { name: new RegExp(patientName) });
  viewIcon = (patientName: string) => this.row(patientName).getByRole('button', { name: /view/i });
}
