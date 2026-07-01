import { BasePage } from '../BasePage';

/** client/src/pages/dashboard/Dashboard.js */
export class DashboardPage extends BasePage {
  readonly path = '/app/dashboard';

  greeting = () => this.page.getByText(/welcome,/i);
  refreshButton = () => this.page.getByRole('button', { name: /refresh/i });

  totalPatientsCard = () => this.page.getByText('Total Patients');
  pendingReferralsCard = () => this.page.getByText('Pending Referrals');
  careQualityCard = () => this.page.getByText('Care Quality Index');
  tokenBalanceCard = () => this.page.getByText('Token Balance');

  // Quick actions — exact labels verified in Dashboard.js
  addPatientButton = () => this.page.getByRole('button', { name: 'Add Patient' });
  createReferralButton = () => this.page.getByRole('button', { name: 'Create Referral' });
  newAnalysisButton = () => this.page.getByRole('button', { name: 'New Analysis' });
  schedulePatientButton = () => this.page.getByRole('button', { name: 'Schedule Patient' });
  dtxMarketplaceButton = () => this.page.getByRole('button', { name: 'DTx Marketplace' });
  transferTokensButton = () => this.page.getByRole('button', { name: 'Transfer Tokens' });

  fullScheduleButton = () => this.page.getByRole('button', { name: /full schedule/i });
  viewAllActivityButton = () => this.page.getByRole('button', { name: /view all activity/i });

  tab = (name: 'Overview' | 'Patient Analytics' | 'Referral Metrics' | 'Clinical Outcomes' | 'AI Performance') =>
    this.page.getByRole('tab', { name });
}
