import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminPriorAuth.js */
export class AdminPriorAuthPage extends BasePage {
  readonly path = '/admin/prior-auth';

  overdueAppealsBanner = () => this.page.getByText(/appeal\(s\) past sla deadline/i);
  statCard = (label: 'Pending' | 'Under Review' | 'Approved' | 'Denied' | 'Appealing' | 'Expired') => this.page.getByText(label);

  searchInput = () => this.page.getByPlaceholder(/search patient, service, provider/i);
  statusSelect = () => this.page.getByLabel(/^status/i);

  row = (patientOrService: string) => this.page.getByRole('row', { name: new RegExp(patientOrService) });
  checkbox = (rowMatch: string) => this.row(rowMatch).getByRole('checkbox');
  reviewButton = (rowMatch: string) => this.row(rowMatch).getByRole('button', { name: /review/i });
  aiAnalysisButton = (rowMatch: string) => this.row(rowMatch).getByRole('button', { name: /ai analysis/i });
  viewHistoryButton = (rowMatch: string) => this.row(rowMatch).getByRole('button', { name: /view history/i });

  // Review dialog
  decisionSelect = () => this.page.getByLabel(/decision/i);
  reviewNotesInput = () => this.page.getByLabel(/notes/i);
  denialReasonCodeSelect = () => this.page.getByLabel(/denial reason/i);
  approvalDurationSelect = () => this.page.getByLabel(/approval duration|duration/i);
  submitReviewButton = () => this.page.getByRole('button', { name: /submit review/i });

  // Bulk actions
  bulkApproveButton = () => this.page.getByRole('button', { name: /bulk approve/i });
  bulkDenyButton = () => this.page.getByRole('button', { name: /bulk deny/i });
  clearSelectionButton = () => this.page.getByRole('button', { name: /clear selection/i });
  selectedCountText = () => this.page.getByText(/selected$/i);

  async approve(rowMatch: string, approvalDurationDays: string): Promise<void> {
    await this.reviewButton(rowMatch).click();
    await this.selectMuiOption(/decision/i, 'Approved');
    await this.selectMuiOption(/approval duration|duration/i, new RegExp(approvalDurationDays));
    await this.submitReviewButton().click();
  }

  async deny(rowMatch: string, carcCode: string): Promise<void> {
    await this.reviewButton(rowMatch).click();
    await this.selectMuiOption(/decision/i, 'Denied');
    await this.selectMuiOption(/denial reason/i, new RegExp(carcCode));
    await this.submitReviewButton().click();
  }
}
