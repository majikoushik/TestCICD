import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminReferralMatching.js — 2 tabs: Match Analytics / Provider Profiles */
export class AdminReferralMatchingPage extends BasePage {
  readonly path = '/admin/referral-matching';

  matchAnalyticsTabButton = () => this.page.getByRole('button', { name: 'Match Analytics' });
  providerProfilesTabButton = () => this.page.getByRole('button', { name: 'Provider Profiles' });
  refreshButton = () => this.page.getByRole('button', { name: /refresh/i });

  // Provider Profiles tab
  searchProvidersInput = () => this.page.getByLabel(/search providers/i);
  specialtyFilterSelect = () => this.page.getByLabel(/^specialty/i);
  stateFilterSelect = () => this.page.getByLabel(/^state/i);
  acceptingOnlyToggle = () => this.page.getByRole('button', { name: /accepting only|all availability/i });

  providerRow = (providerName: string) => this.page.getByRole('row', { name: new RegExp(providerName) });
  viewEditIcon = (providerName: string) => this.providerRow(providerName).getByRole('button', { name: /view.*edit/i });

  availabilityScoreInput = () => this.page.getByLabel(/availability score/i);
  acceptingReferralsSelect = () => this.page.getByLabel(/accepting referrals/i);
  acceptedInsuranceInput = () => this.page.getByLabel(/accepted insurance/i);
  saveButton = () => this.page.getByRole('button', { name: /^save$/i });
  forbiddenError = () => this.page.getByText(/forbidden: admin access required/i);

  async editProvider(providerName: string, opts: { availabilityScore?: number; accepting?: boolean; insurance?: string }): Promise<void> {
    await this.viewEditIcon(providerName).click();
    if (opts.availabilityScore !== undefined) await this.availabilityScoreInput().fill(String(opts.availabilityScore));
    if (opts.accepting !== undefined) await this.selectMuiOption(/accepting referrals/i, opts.accepting ? 'Yes' : 'No');
    if (opts.insurance) await this.acceptedInsuranceInput().fill(opts.insurance);
    await this.saveButton().click();
  }
}
