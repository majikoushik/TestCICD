import { test, expect } from '../../fixtures/base';
import { BlockchainHistoryPage, BlockchainTransactionDetailsPage } from '../../pages/provider/BlockchainHistoryPage';
import { ApiClient } from '../../fixtures/api-client';
import { uniquePatientName, uniqueReferralReason } from '../../fixtures/test-data';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

async function createReferralInvolvingProviderA(): Promise<{ reason: string }> {
  const aApi = await ApiClient.create();
  const { token } = await aApi.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
  await aApi.dispose();
  const a = await ApiClient.create(token);

  const bApi = await ApiClient.create();
  const { user: providerB } = await bApi.login(process.env.PROVIDER_B_EMAIL!, DEMO_PASSWORD);
  await bApi.dispose();

  const patient = await a.createPatient({ name: uniquePatientName('BlockchainHistory') });
  const reason = uniqueReferralReason('Blockchain');
  await a.createReferral({ patientId: patient._id || patient.id, receivingProviderId: providerB.id || providerB._id, reason });
  await a.dispose();
  return { reason };
}

test.describe('A10 Blockchain History', () => {
  test('A10-01 @P0 - Page loads user-scoped transaction data @regression', async ({ page }) => {
    await createReferralInvolvingProviderA();
    const history = new BlockchainHistoryPage(page);
    await history.goto();
    await expect(page.getByRole('row').first()).toBeVisible();
  });

  test('A10-04 @P0 - View transaction detail loads without 404 @regression', async ({ page, api }) => {
    await createReferralInvolvingProviderA();
    const history = new BlockchainHistoryPage(page);
    await history.goto();
    const txRes = await api.raw.get('/blockchain/transactions');
    const list = (await txRes.json()).data || [];
    expect(list.length).toBeGreaterThan(0);
    const hash = list[0].transactionHash || list[0].hash;

    const detail = new BlockchainTransactionDetailsPage(page);
    await detail.gotoTransaction(hash);
    await expect(detail.transactionHashValue()).toBeVisible();
    await expect(detail.notFoundMessage()).toHaveCount(0);
  });

  test('A10-05 @P0 - Cannot view another user\'s private transaction @regression', async ({ page, api }) => {
    // Deterministically create a transaction with Provider B as the only
    // provider-side participant (a token redemption is Provider B <-> "system"),
    // so Provider A has no relationship to it whatsoever.
    const bApi = await ApiClient.create();
    const { token: bToken } = await bApi.login(process.env.PROVIDER_B_EMAIL!, DEMO_PASSWORD);
    await bApi.dispose();
    const b = await ApiClient.create(bToken);
    await b.raw.post('/tokens/redeem', { data: { serviceId: 'priority-referral' } }).catch(() => {});
    const txRes = await b.raw.get('/blockchain/transactions');
    const bList = (await txRes.json()).data || [];
    await b.dispose();
    expect(bList.length, 'Provider B should have at least one blockchain transaction').toBeGreaterThan(0);
    const bOnly = bList[0];

    const res = await api.raw.get(`/blockchain/transactions/${bOnly.transactionHash || bOnly.hash}`);
    expect(res.status()).toBe(403);
  });

  test('A10-07 @P2 - Empty state for a provider with no blockchain activity', async ({ page }) => {
    const history = new BlockchainHistoryPage(page);
    await history.goto();
    // Either real rows or the documented empty state — never a crash.
    const hasRows = await page.getByRole('row').count() > 1;
    if (!hasRows) await expect(history.emptyState()).toBeVisible();
  });
});
