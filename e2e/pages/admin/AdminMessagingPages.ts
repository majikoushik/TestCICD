import { BasePage } from '../BasePage';

/** client/src/pages/admin/messaging/BroadcastMessages.js */
export class AdminBroadcastMessagesPage extends BasePage {
  readonly path = '/admin/messaging/broadcast';

  newMessageButton = () => this.page.getByRole('button', { name: /new message/i });
  titleInput = () => this.page.getByLabel(/title/i);
  contentInput = () => this.page.getByLabel(/content|message/i);
  saveButton = () => this.page.getByRole('button', { name: /^save$/i });

  row = (title: string) => this.page.getByRole('row', { name: new RegExp(title) });
  sendIcon = (title: string) => this.row(title).getByRole('button', { name: /send/i });
  editIcon = (title: string) => this.row(title).getByRole('button', { name: /edit/i });
  deleteIcon = (title: string) => this.row(title).getByRole('button', { name: /delete/i });

  async createDraft(title: string, content: string): Promise<void> {
    await this.newMessageButton().click();
    await this.titleInput().fill(title);
    await this.contentInput().fill(content);
    await this.saveButton().click();
  }
}

/** client/src/pages/admin/messaging/TargetedAlerts.js */
export class AdminTargetedAlertsPage extends BasePage {
  readonly path = '/admin/messaging/targeted-alerts';

  newAlertButton = () => this.page.getByRole('button', { name: /new alert/i });
  recipientsInput = () => this.page.getByLabel(/recipients/i);
  titleInput = () => this.page.getByLabel(/title/i);
  messageInput = () => this.page.getByLabel(/message/i);
  severitySelect = () => this.page.getByLabel(/severity/i);
  saveButton = () => this.page.getByRole('button', { name: /^save$/i });

  row = (title: string) => this.page.getByRole('row', { name: new RegExp(title) });
  sendIcon = (title: string) => this.row(title).getByRole('button', { name: /send/i });
  alreadySentError = () => this.page.getByText(/already sent/i);
}

/** client/src/pages/admin/messaging/EscalationWorkflows.js */
export class AdminEscalationWorkflowsPage extends BasePage {
  readonly path = '/admin/messaging/escalations';

  statusFilterSelect = () => this.page.getByLabel(/status/i);
  row = (label: string) => this.page.getByRole('row', { name: new RegExp(label) });

  assignButton = (rowMatch: string) => this.row(rowMatch).getByRole('button', { name: /assign/i });
  resolveButton = (rowMatch: string) => this.row(rowMatch).getByRole('button', { name: /resolve/i });

  providerAutocomplete = () => this.page.getByLabel(/provider/i);
  confirmAssignButton = () => this.page.getByRole('button', { name: /confirm/i });

  resolutionNotesInput = () => this.page.getByLabel(/resolution notes/i);
  resolverSelect = () => this.page.getByLabel(/resolver|resolved by/i);
  confirmResolveButton = () => this.page.getByRole('button', { name: /confirm/i });
}

/** client/src/pages/admin/messaging/ProviderThreads.js */
export class AdminProviderThreadsPage extends BasePage {
  readonly path = '/admin/messaging/threads';

  threadRow = (referralLabel: string) => this.page.getByRole('row', { name: new RegExp(referralLabel) });
}
