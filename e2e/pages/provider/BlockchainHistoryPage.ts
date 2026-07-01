import { BasePage } from '../BasePage';

/** client/src/pages/blockchain/BlockchainHistory.js + BlockchainTransactionDetails.js */
export class BlockchainHistoryPage extends BasePage {
  readonly path = '/app/blockchain/history';

  searchInput = () => this.page.getByPlaceholder(/search by transaction hash/i);
  filterButton = () => this.page.getByRole('button', { name: /filter/i });

  row = (eventOrHash: string | RegExp) => this.page.getByRole('row', { name: eventOrHash });
  viewDetailsIcon = (rowMatch: string | RegExp) => this.row(rowMatch).getByRole('button', { name: /view details/i });
  copyHashIcon = (rowMatch: string | RegExp) => this.row(rowMatch).getByRole('button', { name: /copy hash/i });

  emptyState = () => this.page.getByText(/no transactions found/i);
}

export class BlockchainTransactionDetailsPage extends BasePage {
  readonly path = '';

  gotoTransaction(hash: string) {
    return this.page.goto(`/app/blockchain/transaction/${hash}`);
  }

  transactionHashValue = () => this.page.getByText('Transaction Hash').locator('xpath=following-sibling::*[1]');
  notFoundMessage = () => this.page.getByText(/transaction not found|not authorized/i);
}
