import { BasePage } from '../BasePage';

/** client/src/pages/notifications/Notifications.js */
export class NotificationsPage extends BasePage {
  readonly path = '/app/notifications';

  markAllAsReadButton = () => this.page.getByRole('button', { name: /mark all as read/i });
  tab = (name: 'All' | 'Unread' | 'High Priority' | 'Read') => this.page.getByRole('tab', { name: new RegExp(name) });

  notificationItem = (title: string) => this.page.getByRole('listitem').filter({ hasText: title });
  markAsReadIcon = (title: string) => this.notificationItem(title).getByRole('button', { name: /mark as read/i });
  deleteIcon = (title: string) => this.notificationItem(title).getByRole('button', { name: /delete/i });

  async markAsRead(title: string): Promise<void> {
    await this.markAsReadIcon(title).click();
  }

  async delete(title: string): Promise<void> {
    await this.deleteIcon(title).click();
  }
}
