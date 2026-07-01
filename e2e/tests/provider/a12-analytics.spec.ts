import { test, expect } from '../../fixtures/base';
import { AnalyticsDashboardPage, CreateAnalyticsPage } from '../../pages/provider/AnalyticsPages';

test.describe('A12 Analytics', () => {
  test('A12-01 @P0 - Analytics dashboard loads', async ({ page }) => {
    const dashboard = new AnalyticsDashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.newAnalysisButton()).toBeVisible();
  });

  test('A12-02 @P0 - Create a new analytics report @regression', async ({ page }) => {
    const dashboard = new AnalyticsDashboardPage(page);
    await dashboard.goto();
    await dashboard.newAnalysisButton().click();

    const create = new CreateAnalyticsPage(page);
    const name = `E2E_ Report ${Date.now()}`;
    await create.nameInput().fill(name);
    await create.typeSelect().click();
    await page.getByRole('option').first().click();
    await create.descriptionInput().fill('E2E_ generated report for A12-02.');
    await create.createReportButton().click();

    await expect(page.getByText(/report created|analysis started/i)).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();
  });

  test('A12-04 @P1 - Reports list filter tabs switch correctly', async ({ page }) => {
    const dashboard = new AnalyticsDashboardPage(page);
    await dashboard.goto();
    for (const tab of ['All Reports', 'Completed', 'In Progress'] as const) {
      await dashboard.tab(tab).click();
      await expect(dashboard.tab(tab)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('A12-06 @P0 - Take Action on an alert with no linked report shows an in-app message @regression', async ({ page, api }) => {
    const dashboard = new AnalyticsDashboardPage(page);
    await dashboard.goto();
    const alertsRes = await api.raw.get('/analytics/predictive-alerts');
    const alerts = (await alertsRes.json()).data || [];
    const unlinked = alerts.find((a: any) => !a.sourceId);
    test.skip(!unlinked, 'No predictive alert without a linked report exists in this environment.');

    await dashboard.openAlertDetails(unlinked.title);
    await dashboard.takeActionButton().click();
    await expect(dashboard.noLinkedReportMessage()).toBeVisible();
  });

  test('A12-07 @P1 - Close alert details without acting has no side effects', async ({ page, api }) => {
    const alertsRes = await api.raw.get('/analytics/predictive-alerts');
    const alerts = (await alertsRes.json()).data || [];
    test.skip(alerts.length === 0, 'No predictive alerts exist in this environment.');

    const dashboard = new AnalyticsDashboardPage(page);
    await dashboard.goto();
    await dashboard.openAlertDetails(alerts[0].title);
    await dashboard.closeAlertButton().click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
