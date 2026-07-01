import { test, expect } from '../../fixtures/base';
import { DashboardPage } from '../../pages/provider/DashboardPage';

test.describe('A4 Dashboard', () => {
  test('A4-01 @P0 - Dashboard loads with real stat values @regression', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.greeting()).toBeVisible();
    await expect(dashboard.totalPatientsCard()).toBeVisible();
    await expect(dashboard.pendingReferralsCard()).toBeVisible();
    await expect(dashboard.careQualityCard()).toBeVisible();
    await expect(dashboard.tokenBalanceCard()).toBeVisible();
  });

  test('A4-02 @P1 - Refresh button re-fetches dashboard data', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.refreshButton().click();
    await expect(dashboard.totalPatientsCard()).toBeVisible();
  });

  test('A4-03 @P0 - Stat cards navigate to the correct pages @regression', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.totalPatientsCard().click();
    await expect(page).toHaveURL(/\/app\/patients$/);

    await dashboard.goto();
    await dashboard.pendingReferralsCard().click();
    await expect(page).toHaveURL(/\/app\/referrals\?status=pending/);

    await dashboard.goto();
    await dashboard.careQualityCard().click();
    await expect(page).toHaveURL(/\/app\/analytics\/care-quality/);

    await dashboard.goto();
    await dashboard.tokenBalanceCard().click();
    await expect(page).toHaveURL(/\/app\/tokens$/);
  });

  test('A4-04 @P0 - Quick action buttons navigate correctly @regression', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const routes: Array<[() => ReturnType<typeof dashboard.addPatientButton>, RegExp]> = [
      [dashboard.addPatientButton, /\/app\/patients\/add/],
      [dashboard.createReferralButton, /\/app\/referrals\/create/],
      [dashboard.newAnalysisButton, /\/app\/analytics\/create/],
      [dashboard.schedulePatientButton, /\/app\/appointments\/book/],
      [dashboard.dtxMarketplaceButton, /\/app\/dtx\/marketplace/],
      [dashboard.transferTokensButton, /\/app\/tokens\/transfer/],
    ];
    for (const [locatorFn, expectedUrl] of routes) {
      await dashboard.goto();
      await locatorFn().click();
      await expect(page).toHaveURL(expectedUrl);
    }
  });

  test('A4-05 @P1 - Today\'s Schedule panel links to Full Schedule', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.fullScheduleButton().click();
    await expect(page).toHaveURL(/\/app\/schedule/);
  });

  test('A4-07 @P1 - Recent Activity panel links to View All Activity', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.viewAllActivityButton().click();
    await expect(page).toHaveURL(/\/app\/activity/);
  });

  test('A4-08 @P1 - Dashboard tabs render without erroring', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    for (const name of ['Patient Analytics', 'Referral Metrics', 'Clinical Outcomes', 'AI Performance'] as const) {
      await dashboard.tab(name).click();
      await expect(dashboard.tab(name)).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText(/unexpected error|something went wrong/i)).toHaveCount(0);
    }
  });
});
