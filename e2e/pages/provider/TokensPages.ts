import { BasePage } from '../BasePage';

/** client/src/pages/tokens/TokenDashboard.js */
export class TokenDashboardPage extends BasePage {
  readonly path = '/app/tokens';

  balanceText = () => this.page.getByTestId('token-balance').or(this.page.getByText(/token balance/i));
  transferButton = () => this.page.getByRole('button', { name: 'Transfer' });
  redeemButton = () => this.page.getByRole('button', { name: 'Redeem' });
  earnSourcesSection = () => this.page.getByText(/ways to earn tokens/i);

  transactionRow = (reason: string) => this.page.getByRole('row', { name: new RegExp(reason) });
}

/** client/src/pages/tokens/TokenTransfer.js */
export class TokenTransferPage extends BasePage {
  readonly path = '/app/tokens/transfer';

  pageTitle = () => this.page.getByRole('heading', { name: 'Transfer Tokens' });
  recipientInput = () => this.page.getByLabel(/recipient/i);
  amountInput = () => this.page.getByLabel(/amount/i);
  noteInput = () => this.page.getByLabel(/note/i);
  submitButton = () => this.page.getByRole('button', { name: /transfer/i }).last();
  insufficientBalanceError = () => this.page.getByText(/insufficient/i);

  async selectRecipient(name: string): Promise<void> {
    await this.recipientInput().fill(name);
    await this.page.getByRole('option', { name: new RegExp(name) }).first().click();
  }

  async transfer(recipientName: string, amount: number, note?: string): Promise<void> {
    await this.selectRecipient(recipientName);
    await this.amountInput().fill(String(amount));
    if (note) await this.noteInput().fill(note);
    await this.submitButton().click();
  }
}

/** client/src/pages/tokens/TokenRedeem.js */
export class TokenRedeemPage extends BasePage {
  readonly path = '/app/tokens/redeem';

  pageTitle = () => this.page.getByRole('heading', { name: 'Redeem Tokens' });
  serviceCard = (serviceName: string) => this.page.getByText(serviceName);
  redeemButtonFor = (serviceName: string) =>
    this.serviceCard(serviceName).locator('xpath=ancestor::*[contains(@class,"MuiCard")][1]').getByRole('button', { name: /redeem/i });
  confirmRedemptionButton = () => this.page.getByRole('button', { name: /confirm/i });
  insufficientBalanceError = () => this.page.getByText(/insufficient/i);
}
