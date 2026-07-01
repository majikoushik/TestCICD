import { test, expect } from '../../fixtures/base';
import { TokenDashboardPage, TokenTransferPage, TokenRedeemPage } from '../../pages/provider/TokensPages';
import { ApiClient } from '../../fixtures/api-client';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

/** Tops up the current provider's balance via the admin mint endpoint so balance-dependent tests are deterministic. */
async function ensureMinBalance(providerApi: ApiClient, min: number): Promise<number> {
  const current = await providerApi.getTokenBalance();
  if (current >= min) return current;

  const meBody = await (await providerApi.raw.get('/auth/me')).json();
  const providerId = meBody.user?.id || meBody.user?._id;

  const admin = await ApiClient.create();
  const { token: adminToken } = await admin.adminLogin(process.env.ADMIN_EMAIL!, DEMO_PASSWORD);
  await admin.dispose();
  const adminClient = await ApiClient.create(adminToken);
  await adminClient.raw.post('/admin/tokens/mint', { data: { providerId, amount: min - current + 5, reason: 'E2E_ top-up for token test' } });
  await adminClient.dispose();
  return providerApi.getTokenBalance();
}

test.describe('A8 Tokens', () => {
  test('A8-01 @P0 - Token dashboard loads balance and history', async ({ page }) => {
    const dashboard = new TokenDashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.balanceText()).toBeVisible();
  });

  test('A8-02 @P0 - Transfer tokens moves balance to the recipient @regression', async ({ page, api }) => {
    const before = await ensureMinBalance(api, 5);

    const transfer = new TokenTransferPage(page);
    await transfer.goto();
    await transfer.transfer('Michael Chen', 1, 'E2E_ test transfer');
    await expect(page.getByText(/transfer (successful|complete)/i)).toBeVisible();

    const after = await api.getTokenBalance();
    expect(after).toBe(before - 1);
  });

  test('A8-03 @P0 - Transfer rejects an amount exceeding the balance @regression', async ({ page, api }) => {
    const balance = await api.getTokenBalance();
    const transfer = new TokenTransferPage(page);
    await transfer.goto();
    await transfer.transfer('Michael Chen', balance + 100000);
    await expect(page.getByText(/insufficient/i)).toBeVisible();
    expect(await api.getTokenBalance()).toBe(balance);
  });

  test('A8-04 @P0 - Recipient list excludes the current user', async ({ page }) => {
    const transfer = new TokenTransferPage(page);
    await transfer.goto();
    await transfer.recipientInput().fill('John Smith'); // Provider A's own seeded name
    await expect(page.getByRole('option', { name: /john smith/i })).toHaveCount(0);
  });

  test('A8-05 @P1 - Transfer validation blocks empty recipient or non-positive amount', async ({ page }) => {
    const transfer = new TokenTransferPage(page);
    await transfer.goto();
    await transfer.amountInput().fill('0');
    await transfer.submitButton().click();
    await expect(page.getByText(/required|greater than 0|invalid amount/i).first()).toBeVisible();
  });

  test('A8-06 @P0 - Redeem tokens for a catalog service @regression', async ({ page, api }) => {
    const before = await ensureMinBalance(api, 10);

    const redeem = new TokenRedeemPage(page);
    await redeem.goto();
    await redeem.redeemButtonFor('Basic AI Analysis').click();
    await redeem.confirmRedemptionButton().click();
    await expect(page.getByText(/redeemed successfully|redemption complete/i)).toBeVisible();

    const after = await api.getTokenBalance();
    expect(after).toBeLessThan(before);
  });

  test('A8-07 @P0 - Redeem rejects a service costing more than the balance @regression', async ({ page, api }) => {
    // TokenRedeem.js disables the Redeem button client-side whenever
    // tokenBalance < service.tokenCost, so an over-balance redemption can
    // never reach the confirmation dialog through the UI. "Extended Network
    // Data Access" (serviceId extended-data-access) costs 50 — force the
    // balance below that deterministically by transferring away any excess.
    const EXPENSIVE_SERVICE = 'Extended Network Data Access';
    const EXPENSIVE_SERVICE_ID = 'extended-data-access';
    const EXPENSIVE_COST = 50;

    let balance = await api.getTokenBalance();
    if (balance >= EXPENSIVE_COST) {
      const providerBApi = await ApiClient.create();
      const { user: providerB } = await providerBApi.login(process.env.PROVIDER_B_EMAIL!, process.env.DEMO_PASSWORD || 'Demo1234!');
      await providerBApi.dispose();
      await api.raw.post('/tokens/transfer', { data: { recipientId: providerB.id || providerB._id, amount: balance - (EXPENSIVE_COST - 1), reason: 'E2E_ rebalance for A8-07' } });
      balance = await api.getTokenBalance();
    }
    expect(balance).toBeLessThan(EXPENSIVE_COST);

    const redeem = new TokenRedeemPage(page);
    await redeem.goto();
    await expect(redeem.redeemButtonFor(EXPENSIVE_SERVICE)).toBeDisabled();
    await expect(page.getByText(/insufficient tokens/i)).toBeVisible();

    const res = await api.raw.post('/tokens/redeem', { data: { serviceId: EXPENSIVE_SERVICE_ID } });
    expect(res.ok()).toBeFalsy();
    const body = await res.json();
    expect(body.error).toMatch(/insufficient token balance/i);
    expect(await api.getTokenBalance()).toBe(balance);
  });

  test('A8-08 @P1 - Ways to Earn Tokens section renders earn sources', async ({ page }) => {
    const dashboard = new TokenDashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.earnSourcesSection()).toBeVisible();
  });
});
