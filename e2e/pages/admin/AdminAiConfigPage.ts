import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminAIManagement.js (AI Configuration section) */
export class AdminAiConfigPage extends BasePage {
  readonly path = '/admin/ai-config';

  autoApproveThresholdInput = () => this.page.getByLabel(/auto-approve threshold/i);
  minConfidenceInput = () => this.page.getByLabel(/minimum confidence/i);
  manualReviewThresholdInput = () => this.page.getByLabel(/manual review threshold/i);
  saveButton = (sectionLabel = '') => this.page.getByRole('button', { name: sectionLabel ? new RegExp(`save.*${sectionLabel}`, 'i') : /^save$/i });
  resetButton = () => this.page.getByRole('button', { name: /^reset$/i });

  async setAutoApproveThreshold(value: number): Promise<void> {
    await this.autoApproveThresholdInput().fill(String(value));
    await this.saveButton().click();
  }
}

/** client/src/pages/admin/AdminAnalytics.js */
export class AdminAnalyticsPage extends BasePage {
  readonly path = '/admin/analytics';
}
