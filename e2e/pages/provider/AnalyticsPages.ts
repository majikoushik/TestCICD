import { BasePage } from '../BasePage';

/** client/src/pages/analytics/AnalyticsDashboard.js */
export class AnalyticsDashboardPage extends BasePage {
  readonly path = '/app/analytics';

  newAnalysisButton = () => this.page.getByRole('button', { name: 'New Analysis' });
  timeRangeSelect = () => this.page.getByLabel(/time range/i);
  tab = (name: 'All Reports' | 'Completed' | 'In Progress') => this.page.getByRole('tab', { name });

  viewFullReportButton = (reportName: string) =>
    this.page.getByText(reportName).locator('xpath=ancestor::*[contains(@class,"MuiCard")][1]').getByRole('button', { name: /view full report/i });

  predictiveAlertCard = (title: string) => this.page.getByText(title);
  takeActionButton = () => this.page.getByRole('button', { name: /take action/i });
  closeAlertButton = () => this.page.getByRole('button', { name: /^close$/i });
  noLinkedReportMessage = () => this.page.getByText(/no linked (analytics )?report/i);

  async openAlertDetails(title: string): Promise<void> {
    await this.predictiveAlertCard(title).click();
  }
}

/** client/src/pages/analytics/CreateAnalytics.js */
export class CreateAnalyticsPage extends BasePage {
  readonly path = '/app/analytics/create';

  nameInput = () => this.page.getByLabel(/analysis name/i);
  typeSelect = () => this.page.getByLabel(/^type/i);
  descriptionInput = () => this.page.getByLabel(/description/i);
  nextButton = () => this.page.getByRole('button', { name: /next/i });
  createReportButton = () => this.page.getByRole('button', { name: /create report/i });
}
