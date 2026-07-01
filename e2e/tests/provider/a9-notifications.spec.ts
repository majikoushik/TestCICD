import { test, expect } from '../../fixtures/base';
import { NotificationsPage } from '../../pages/provider/NotificationsPage';
import { createNotificationFixture } from '../../support/db';
import { uniqueSuffix } from '../../fixtures/test-data';

/**
 * No feature in the app creates an in-app Notification for another user
 * organically (referral creation and admin targeted alerts only send real
 * emails — see support/db.ts createNotificationFixture for the full
 * rationale), so every test here seeds its own fixture notification directly
 * via that helper, then exercises the real GET/PUT/DELETE API + UI exactly
 * as a genuinely-arrived notification would be handled.
 */
async function seedNotification(providerId: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
  const title = `E2E_Notification_${uniqueSuffix()}`;
  await createNotificationFixture(providerId, { title, message: 'Fixture notification for A9 spec.', priority });
  return title;
}

test.describe('A9 Notifications', () => {
  test('A9-01 @P0 - Notifications load real data @regression', async ({ page, api }) => {
    const me = await (await api.raw.get('/auth/me')).json();
    const title = await seedNotification(me.user.id);

    const notifications = new NotificationsPage(page);
    await notifications.goto();
    await expect(notifications.notificationItem(title)).toBeVisible();
  });

  test('A9-02 @P0 - Mark as read persists after reload @regression', async ({ page, api }) => {
    const me = await (await api.raw.get('/auth/me')).json();
    const title = await seedNotification(me.user.id);

    const notifications = new NotificationsPage(page);
    await notifications.goto();
    await notifications.markAsReadIcon(title).click();

    await page.reload();
    const after = await api.getNotifications();
    const match = after.find((n: any) => n.title === title);
    expect(match.read).toBe(true);
  });

  test('A9-03 @P0 - Delete persists after reload @regression', async ({ page, api }) => {
    const me = await (await api.raw.get('/auth/me')).json();
    const title = await seedNotification(me.user.id);

    const notifications = new NotificationsPage(page);
    await notifications.goto();
    await notifications.deleteIcon(title).click();
    await expect(notifications.notificationItem(title)).toHaveCount(0);

    await page.reload();
    const after = await api.getNotifications();
    expect(after.find((n: any) => n.title === title)).toBeUndefined();
  });

  test('A9-04 @P0 - Mark All as Read persists after reload @regression', async ({ page, api }) => {
    const me = await (await api.raw.get('/auth/me')).json();
    await seedNotification(me.user.id);
    await seedNotification(me.user.id);

    const notifications = new NotificationsPage(page);
    await notifications.goto();
    await notifications.markAllAsReadButton().click();
    await expect(notifications.markAllAsReadButton()).toBeDisabled();

    await page.reload();
    const after = await api.getNotifications();
    expect(after.every((n: any) => n.read)).toBe(true);
  });

  test('A9-05 @P1 - High Priority tab shows only high/critical notifications @regression', async ({ page, api }) => {
    const me = await (await api.raw.get('/auth/me')).json();
    const highTitle = await seedNotification(me.user.id, 'high');
    await seedNotification(me.user.id, 'low');

    const notifications = new NotificationsPage(page);
    await notifications.goto();
    await notifications.tab('High Priority').click();
    await expect(notifications.notificationItem(highTitle)).toBeVisible();
  });
});
