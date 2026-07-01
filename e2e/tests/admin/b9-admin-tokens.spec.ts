import { test, expect } from '../../fixtures/base';
import { AdminTokensPage } from '../../pages/admin/AdminTokensPage';

test.describe('B9 Admin — Token Management', () => {
  test('B9-01 @P0 - Provider Balances tab loads', async ({ page }) => {
    const tokens = new AdminTokensPage(page);
    await tokens.goto();
    await tokens.searchProvidersInput().fill('Smith');
    await expect(tokens.providerRow('Smith')).toBeVisible();
  });

  test('B9-02 @P1 - Drill into a provider\'s transaction history', async ({ page }) => {
    const tokens = new AdminTokensPage(page);
    await tokens.goto();
    await tokens.searchProvidersInput().fill('John Smith');
    await tokens.historyButton('John Smith').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('B9-03 @P0 - Mint tokens executes immediately in single-admin mode @regression', async ({ page, api }) => {
    const tokens = new AdminTokensPage(page);
    await tokens.goto();
    await tokens.searchProvidersInput().fill('John Smith');
    const balanceRes = await api.raw.get('/admin/tokens/providers');
    const providers = (await balanceRes.json()).data || [];
    const johnSmith = providers.find((p: any) => /john smith/i.test(p.name));
    test.skip(!johnSmith, 'Seeded provider John Smith not found.');
    const before = johnSmith.tokenBalance;

    await tokens.mintButton('John Smith').click();
    await tokens.amountInput().fill('5');
    await tokens.reasonInput().fill('E2E_ mint test B9-03');
    await tokens.mintTokensButton().click();
    await expect(page.getByText(/successfully minted/i)).toBeVisible();

    const afterRes = await api.raw.get('/admin/tokens/providers');
    const after = ((await afterRes.json()).data || []).find((p: any) => /john smith/i.test(p.name));
    expect(after.tokenBalance).toBe(before + 5);
  });

  test('B9-04 @P0 - Mint tokens is queued in multi-sig mode @regression', async ({ api }) => {
    test.skip(!process.env.TOKEN_MULTISIG_REQUIRED || Number(process.env.TOKEN_MULTISIG_REQUIRED) <= 1,
      'This environment is not configured with TOKEN_MULTISIG_REQUIRED > 1.');

    const providersRes = await api.raw.get('/admin/tokens/providers');
    const providers = (await providersRes.json()).data || [];
    const target = providers[0];
    const before = target.tokenBalance;

    const res = await api.raw.post('/admin/tokens/mint', { data: { providerId: target.id, amount: 5, reason: 'E2E_ multisig mint test' } });
    expect(res.status()).toBe(202);
    const body = await res.json();
    expect(body.message).toMatch(/requires \d+ more approval/i);

    const afterRes = await api.raw.get('/admin/tokens/providers');
    const after = ((await afterRes.json()).data || []).find((p: any) => p.id === target.id);
    expect(after.tokenBalance).toBe(before);
  });

  test('B9-06 @P0 - Bonus distribution executes immediately regardless of multi-sig @regression', async ({ page, api }) => {
    const providersRes = await api.raw.get('/admin/tokens/providers');
    const providers = (await providersRes.json()).data || [];
    const johnSmith = providers.find((p: any) => /john smith/i.test(p.name));
    test.skip(!johnSmith, 'Seeded provider John Smith not found.');
    const before = johnSmith.tokenBalance;

    const tokens = new AdminTokensPage(page);
    await tokens.goto();
    await tokens.tab('Bonus Distribution').click();
    await tokens.providerAutocomplete().fill('John Smith');
    await page.getByRole('option', { name: /john smith/i }).first().click();
    await tokens.amountInput().fill('3');
    await tokens.reasonInput().fill('E2E_ bonus test B9-06');
    await tokens.creditTokensButton().click();
    await expect(page.getByText(/credited|bonus (issued|distributed)/i)).toBeVisible();

    const afterRes = await api.raw.get('/admin/tokens/providers');
    const after = ((await afterRes.json()).data || []).find((p: any) => /john smith/i.test(p.name));
    expect(after.tokenBalance).toBe(before + 3);
  });

  test('B9-07 @P1 - Redemption Catalog CRUD persists @regression', async ({ page, api }) => {
    const name = `E2E_ Catalog Item ${Date.now()}`;
    const res = await api.raw.post('/admin/tokens/catalog', {
      data: { serviceId: `e2e-${Date.now()}`, name, description: 'E2E_ catalog item.', category: 'other', tokenCost: 20 },
    });
    expect(res.ok()).toBeTruthy();
    const created = (await res.json()).data;

    const tokens = new AdminTokensPage(page);
    await tokens.goto();
    await tokens.tab('Redemption Catalog').click();
    await expect(page.getByText(name)).toBeVisible();

    const delRes = await api.raw.delete(`/admin/tokens/catalog/${created._id}`);
    expect(delRes.ok()).toBeTruthy();
  });

  test('B9-09 @P0 - Earn Policy editor persists a changed value @regression', async ({ page }) => {
    const tokens = new AdminTokensPage(page);
    await tokens.goto();
    await tokens.tab('Earn Policy').click();
    const field = tokens.earnPolicyField(/referral sent|referralsent/i);
    await field.fill('7');
    await tokens.savePolicyButton().click();
    await expect(page.getByText(/policy saved|earn policy updated/i)).toBeVisible();

    await page.reload();
    await tokens.tab('Earn Policy').click();
    await expect(tokens.earnPolicyField(/referral sent|referralsent/i)).toHaveValue('7');
  });

  test('B9-11 @P1 - Token economy analytics renders', async ({ page }) => {
    const tokens = new AdminTokensPage(page);
    await tokens.goto();
    await tokens.tab('Analytics').click();
    await expect(page.getByText(/total circulating/i)).toBeVisible();
  });
});
