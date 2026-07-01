import { test, expect } from '../../fixtures/base';
import {
  AdminBroadcastMessagesPage,
  AdminTargetedAlertsPage,
  AdminEscalationWorkflowsPage,
} from '../../pages/admin/AdminMessagingPages';
import { createEscalationFixture } from '../../support/db';
import { uniquePatientName } from '../../fixtures/test-data';

test.describe('B4 Admin — Messaging', () => {
  test('B4-01 @P0 - Create a broadcast message as a draft @regression', async ({ page }) => {
    const title = `E2E_ Broadcast ${Date.now()}`;
    const broadcast = new AdminBroadcastMessagesPage(page);
    await broadcast.goto();
    await broadcast.createDraft(title, 'E2E_ broadcast content for B4-01.');
    await expect(broadcast.row(title)).toBeVisible();
    await expect(broadcast.row(title)).toContainText(/draft/i);
  });

  test('B4-02 @P0 - Send a broadcast message @regression', async ({ page }) => {
    const title = `E2E_ BroadcastSend ${Date.now()}`;
    const broadcast = new AdminBroadcastMessagesPage(page);
    await broadcast.goto();
    await broadcast.createDraft(title, 'E2E_ broadcast to send for B4-02.');
    await broadcast.sendIcon(title).click();
    await page.getByRole('button', { name: /confirm|send/i }).last().click();
    await expect(broadcast.row(title)).toContainText(/sent/i);
  });

  test('B4-03 @P1 - Edit and delete a draft broadcast message', async ({ page }) => {
    const title = `E2E_ BroadcastEdit ${Date.now()}`;
    const broadcast = new AdminBroadcastMessagesPage(page);
    await broadcast.goto();
    await broadcast.createDraft(title, 'Original content.');
    await broadcast.editIcon(title).click();
    await broadcast.contentInput().fill('Updated content for B4-03.');
    await broadcast.saveButton().click();

    await broadcast.deleteIcon(title).click();
    await page.getByRole('button', { name: /confirm|delete/i }).last().click();
    await expect(broadcast.row(title)).toHaveCount(0);
  });

  test('B4-04 @P0 - Create a targeted alert with recipients @regression', async ({ page }) => {
    const title = `E2E_ Alert ${Date.now()}`;
    const alerts = new AdminTargetedAlertsPage(page);
    await alerts.goto();
    await alerts.newAlertButton().click();
    await alerts.recipientsInput().fill('John Smith');
    await page.getByRole('option', { name: /john smith/i }).first().click();
    await alerts.titleInput().fill(title);
    await alerts.messageInput().fill('E2E_ targeted alert content.');
    await alerts.severitySelect().click();
    await page.getByRole('option').first().click();
    await alerts.saveButton().click();
    await expect(alerts.row(title)).toBeVisible();
  });

  test('B4-05 @P0 - Send a targeted alert without a 404 @regression', async ({ page }) => {
    const title = `E2E_ AlertSend ${Date.now()}`;
    const alerts = new AdminTargetedAlertsPage(page);
    await alerts.goto();
    await alerts.newAlertButton().click();
    await alerts.recipientsInput().fill('John Smith');
    await page.getByRole('option', { name: /john smith/i }).first().click();
    await alerts.titleInput().fill(title);
    await alerts.messageInput().fill('E2E_ targeted alert to send for B4-05.');
    await alerts.severitySelect().click();
    await page.getByRole('option').first().click();
    await alerts.saveButton().click();

    await alerts.sendIcon(title).click();
    await page.getByRole('button', { name: /confirm|send/i }).last().click();
    await expect(alerts.row(title)).toContainText(/sent/i);
  });

  test('B4-06 @P1 - Cannot re-send an already-sent alert', async ({ page, api }) => {
    const title = `E2E_ AlertResend ${Date.now()}`;
    const createRes = await api.raw.post('/admin/messages/alerts', {
      data: { title, content: 'E2E_ resend test.', status: 'sent', recipients: [] },
    });
    const alert = (await createRes.json()).data;

    const res = await api.raw.post(`/admin/messages/alerts/${alert._id}/send`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already sent/i);
  });

  test('B4-08 @P0 - Escalation workflows list and filter @regression', async ({ page }) => {
    await createEscalationFixture(`E2E_ Escalation ${Date.now()}`, uniquePatientName('EscalationList'));
    const escalations = new AdminEscalationWorkflowsPage(page);
    await escalations.goto();
    await escalations.statusFilterSelect().click();
    await page.getByRole('option', { name: /pending review/i }).click();
  });

  test('B4-09 @P0 - Assign an escalation to a provider @regression', async ({ page }) => {
    const title = `E2E_ Escalation Assign ${Date.now()}`;
    await createEscalationFixture(title, uniquePatientName('EscalationAssign'));

    const escalations = new AdminEscalationWorkflowsPage(page);
    await escalations.goto();
    await escalations.assignButton(title).click();
    await escalations.providerAutocomplete().fill('John Smith');
    await page.getByRole('option', { name: /john smith/i }).first().click();
    await escalations.confirmAssignButton().click();
    await expect(escalations.row(title)).toContainText(/john smith|in progress|assigned/i);
  });

  test('B4-10 @P0 - Resolve an assigned escalation @regression', async ({ page, api }) => {
    const title = `E2E_ Escalation Resolve ${Date.now()}`;
    const id = await createEscalationFixture(title, uniquePatientName('EscalationResolve'));
    await api.raw.post(`/admin/escalations/${id}/assign`, { data: { id: 'seed', name: 'Dr. John Smith', email: 'john.smith@clinictrustai.com' } });

    const escalations = new AdminEscalationWorkflowsPage(page);
    await escalations.goto();
    await escalations.resolveButton(title).click();
    await escalations.resolutionNotesInput().fill('E2E_ resolved via automated test.');
    await escalations.confirmResolveButton().click();
    await expect(escalations.row(title)).toContainText(/resolved/i);
  });
});
