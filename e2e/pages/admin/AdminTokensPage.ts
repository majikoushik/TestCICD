import { BasePage } from '../BasePage';

/** client/src/pages/admin/AdminTokenManagement.js — 6 tabs */
export class AdminTokensPage extends BasePage {
  readonly path = '/admin/tokens';

  tab = (name: 'Provider Balances' | 'Bonus Distribution' | 'Redemption Catalog' | 'Conversion Rules' | 'Analytics' | 'Earn Policy') =>
    this.page.getByRole('tab', { name });

  searchProvidersInput = () => this.page.getByPlaceholder(/search providers/i);
  providerRow = (providerName: string) => this.page.getByRole('row', { name: new RegExp(providerName) });
  historyButton = (providerName: string) => this.providerRow(providerName).getByRole('button', { name: /history/i });
  mintButton = (providerName: string) => this.providerRow(providerName).getByRole('button', { name: /mint/i });
  burnButton = (providerName: string) => this.providerRow(providerName).getByRole('button', { name: /burn/i });

  // Mint/Burn dialog
  amountInput = () => this.page.getByLabel(/amount/i);
  reasonInput = () => this.page.getByLabel(/reason/i);
  mintTokensButton = () => this.page.getByRole('button', { name: /mint tokens/i });
  burnTokensButton = () => this.page.getByRole('button', { name: /burn tokens/i });
  multisigQueuedMessage = () => this.page.getByText(/requires \d+ more approval/i);

  // Bonus Distribution tab
  providerAutocomplete = () => this.page.getByLabel(/provider/i);
  creditTokensButton = () => this.page.getByRole('button', { name: /credit tokens/i });

  // Earn Policy tab
  earnPolicyField = (label: string) => this.page.getByLabel(label);
  savePolicyButton = () => this.page.getByRole('button', { name: /save policy/i });

  // Redemption & Limits
  tokenToUsdInput = () => this.page.getByLabel(/token.*usd value/i);
  saveLimitsButton = () => this.page.getByRole('button', { name: /save limits/i });
}
