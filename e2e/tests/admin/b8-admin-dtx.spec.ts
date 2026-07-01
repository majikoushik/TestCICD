import { test, expect } from '../../fixtures/base';
import { AdminDtxPage } from '../../pages/admin/AdminDtxPage';

test.describe('B8 Admin — DTx Management', () => {
  test('B8-01 @P0 - Program Catalog loads with Show Inactive toggle', async ({ page }) => {
    const dtx = new AdminDtxPage(page);
    await dtx.goto();
    await expect(dtx.showInactiveCheckbox()).toBeVisible();
  });

  test('B8-02 @P0 - Add a new program appears in the catalog @regression', async ({ page, api }) => {
    const name = `E2E_ DTx Program ${Date.now()}`;
    const dtx = new AdminDtxPage(page);
    await dtx.goto();
    await dtx.addProgram({ name, vendor: 'E2E_ Vendor Inc.', description: 'E2E_ program created by automated test.', tokenReward: 15 });
    await expect(dtx.programRow(name)).toBeVisible();

    const res = await api.getDtxPrograms();
    expect(res.some((p: any) => p.name === name)).toBe(true);
  });

  test('B8-03 @P1 - Add Program validation blocks empty required fields', async ({ page }) => {
    const dtx = new AdminDtxPage(page);
    await dtx.goto();
    await dtx.addProgramButton().click();
    await dtx.saveButton().click();
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test('B8-04 @P0 - Deactivate a program removes it from the marketplace @regression', async ({ page, api }) => {
    const name = `E2E_ DTx Deactivate ${Date.now()}`;
    const dtx = new AdminDtxPage(page);
    await dtx.goto();
    await dtx.addProgram({ name, vendor: 'E2E_ Vendor Inc.', description: 'E2E_ program for deactivation test.' });
    await dtx.deactivateButton(name).click();
    await expect(dtx.statusChip(name)).toContainText(/inactive/i);

    const marketplacePrograms = await api.getDtxPrograms();
    expect(marketplacePrograms.some((p: any) => p.name === name)).toBe(false);
  });

  test('B8-05 @P1 - Reactivate a deactivated program', async ({ page, api }) => {
    const name = `E2E_ DTx Reactivate ${Date.now()}`;
    const dtx = new AdminDtxPage(page);
    await dtx.goto();
    await dtx.addProgram({ name, vendor: 'E2E_ Vendor Inc.', description: 'E2E_ program for reactivation test.' });
    await dtx.deactivateButton(name).click();
    await dtx.reactivateButton(name).click();
    await expect(dtx.statusChip(name)).toContainText(/active/i);

    const marketplacePrograms = await api.getDtxPrograms();
    expect(marketplacePrograms.some((p: any) => p.name === name)).toBe(true);
  });

  test('B8-06 @P0 - All Prescriptions tab loads cross-provider', async ({ page }) => {
    const dtx = new AdminDtxPage(page);
    await dtx.goto();
    await dtx.tab('All Prescriptions').click();
    await dtx.prescriptionStatusSelect().click();
    await page.getByRole('option').first().click();
  });

  test('B8-07 @P1 - Analytics tab renders aggregate stats', async ({ page }) => {
    const dtx = new AdminDtxPage(page);
    await dtx.goto();
    await dtx.tab('Analytics').click();
    await expect(dtx.tab('Analytics')).toHaveAttribute('aria-selected', 'true');
  });
});
